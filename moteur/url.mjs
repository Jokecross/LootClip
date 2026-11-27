#!/usr/bin/env node
/*
 * XPclip : un lien (YouTube, Twitch, X) → des clips verticaux sous-titrés.
 *
 *   node url.mjs <lien> <dossier-sortie> [nombre de clips] [--etat etat.json]
 *
 * --etat : fichier JSON tenu à jour pour l'écran (étape, avancement, clips prêts, erreur).
 * --options : réglages du joueur en JSON (type, duree, couleur, placement, format, accroche).
 *
 * 1. Téléchargement (yt-dlp, 1080p maximum).
 * 2. Transcription mot à mot de toute la vidéo (Groq).
 * 3. Choix des moments et des accroches (Claude).
 * 4. Un clip par moment (clip.mjs : cadrage, sous-titres, accroche, son).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fabriquer } from "./clip.mjs";
import { choisirMoments, couperPlage, transcrire } from "./clip/ia.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
for (const f of [join(ICI, ".env"), join(ICI, "..", ".env.local"), join(process.env.HOME || "", "LootClip", "moteur", ".env")])
  if (existsSync(f)) process.loadEnvFile(f);

const journal = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);
const chrono = () => {
  const t0 = Date.now();
  return () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
};

/** Télécharge la vidéo en suivant l'avancement (yt-dlp écrit une ligne par mise à jour). */
function telecharger(lien, fichier, surAvancement, plage) {
  return new Promise((ok, ko) => {
    const p = spawn("yt-dlp", [
      "--no-warnings", "--no-playlist", "--newline",
      "--progress-template", "download:%(progress._percent_str)s",
      "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]",
      ...(plage ? ["--download-sections", `*${plage.debut}-${plage.fin}`] : []),
      "--merge-output-format", "mp4", "-o", fichier, lien,
    ]);
    let err = "";
    let passe = 0; // vidéo puis son : deux téléchargements
    let dernier = 0;
    p.stdout.on("data", (d) => {
      for (const l of String(d).split("\n")) {
        const m = /([\d.]+)%/.exec(l);
        if (!m) continue;
        const v = Number(m[1]) / 100;
        if (v < dernier - 0.5) passe++;
        dernier = v;
        surAvancement(Math.min(1, passe === 0 ? v * 0.85 : 0.85 + v * 0.15));
      }
    });
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("error", ko);
    p.on("close", (c) => (c === 0 ? ok() : ko(new Error(err.trim() || `yt-dlp code ${c}`))));
  });
}

/** Phrase simple pour l'écran, à partir de l'erreur technique. */
function cause(e) {
  const m = String(e?.message || e);
  if (/not a bot|Sign in to confirm/i.test(m)) return "La plateforme bloque le téléchargement de cette vidéo.";
  if (/Unsupported URL|is not a valid URL|No video formats|Unable to extract/i.test(m)) return "Ce lien ne mène pas à une vidéo que je peux lire.";
  if (/Private video|members-only|This video is unavailable|removed/i.test(m)) return "Cette vidéo est privée ou n'existe plus.";
  if (/trop longue/i.test(m)) return "Cette vidéo est trop longue (2 h maximum).";
  if (/aucune parole|0 moments/i.test(m)) return "Je n'ai pas trouvé de moment à couper dans cette vidéo.";
  return "Le montage a échoué. Réessaie dans un instant.";
}

async function principal() {
  const args = process.argv.slice(2);
  const iEtat = args.indexOf("--etat");
  const fichierEtat = iEtat >= 0 ? args.splice(iEtat, 2)[1] : null;
  const iOptions = args.indexOf("--options");
  const options = iOptions >= 0 ? JSON.parse(args.splice(iOptions, 2)[1]) : {};
  const [lien, sortie, nombre = "5"] = args;
  if (!lien || !sortie) {
    console.error("Usage : node url.mjs <lien> <dossier-sortie> [nombre de clips] [--etat etat.json]");
    process.exit(1);
  }
  await mkdir(sortie, { recursive: true });

  // L'état lu par l'écran : écrit d'un coup (fichier temporaire puis renommage), une écriture à la fois.
  const etat = { etape: "telechargement", avancement: 0, moments: [], clips: [], erreur: null, debut: Date.now() };
  let ecriture = Promise.resolve();
  let derniere = 0;
  const publier = (force = false) => {
    if (!fichierEtat || (!force && Date.now() - derniere < 400)) return ecriture;
    derniere = Date.now();
    const copie = JSON.stringify(etat);
    ecriture = ecriture.then(async () => {
      await writeFile(`${fichierEtat}.tmp`, copie);
      await rename(`${fichierEtat}.tmp`, fichierEtat);
    }).catch(() => {});
    return ecriture;
  };
  const passer = (etape, avancement = 0) => {
    Object.assign(etat, { etape, avancement });
    return publier(true);
  };

  const dossier = await mkdtemp(join(tmpdir(), "xpclip-url-"));
  try {
    await passer("telechargement");
    let t = chrono();
    const source = join(dossier, "source.mp4");
    const avancer = (v) => {
      etat.avancement = v;
      publier();
    };
    // Seulement le passage choisi (20 min au plus) ; sinon la vidéo entière, puis on coupe.
    const plage = options.plage;
    if (plage) {
      try {
        await telecharger(lien, source, avancer, plage);
      } catch {
        const entiere = join(dossier, "entiere.mp4");
        await telecharger(lien, entiere, avancer);
        await couperPlage(entiere, source, plage);
      }
    } else {
      await telecharger(lien, source, avancer);
    }
    journal(`téléchargé (${t()})`);

    await passer("transcription");
    t = chrono();
    const transcription = await transcrire(source, dossier);
    if (!transcription.mots.length) throw new Error("aucune parole");
    journal(`transcrit : ${transcription.mots.length} mots sur ${Math.round(transcription.duree)} s (${t()})`);

    await passer("choix");
    t = chrono();
    const { moments, usage } = await choisirMoments(transcription, { nombre: Number(nombre), type: options.type, duree: options.duree });
    if (!moments.length) throw new Error("0 moments");
    journal(`${moments.length} moments choisis (${t()}, ${usage.input_tokens} + ${usage.output_tokens} jetons)`);
    await writeFile(join(sortie, "moments.json"), JSON.stringify(moments, null, 1));
    etat.moments = moments.map((m) => ({ titre: m.titre, score: m.score, pourquoi: m.pourquoi, forces: m.forces ?? [], duree: Math.round(m.parties.reduce((s, [a, b]) => s + b - a, 0)) }));

    for (const [i, m] of moments.entries()) {
      await passer("montage", i / moments.length);
      t = chrono();
      const nom = `clip_${i + 1}.mp4`;
      await fabriquer({ source, moment: m, mots: transcription.mots, sortie: join(sortie, nom), reglages: options });
      etat.clips.push({ fichier: nom, ...etat.moments[i] });
      journal(`clip_${i + 1} (${etat.moments[i].duree} s, score ${m.score}) « ${m.titre} » (${t()})`);
    }
    await passer("fini", 1);
  } catch (e) {
    etat.erreur = cause(e);
    await publier(true);
    throw e;
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

principal().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
