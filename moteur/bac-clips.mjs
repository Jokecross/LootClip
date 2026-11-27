/*
 * « Lien → clips » dans une machine Vercel Sandbox créée pour ce lot (voir src/lib/atelier.ts).
 * La machine ne connaît aucune clé : ni Supabase, ni Groq, ni Claude. Elle reçoit seulement
 * le lien de la vidéo, des liens temporaires pour déposer ses fichiers et un jeton pour ce lot.
 *
 *   node bac-clips.mjs tache.json
 *
 * 1. Récupère la vidéo (yt-dlp) et dépose son son compressé ; prévient XPclip (phase « son »).
 * 2. XPclip transcrit et choisit les moments, puis écrit rendu.json dans la machine.
 * 3. Monte chaque clip, le dépose, prévient XPclip ; puis « fini ».
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as attendre } from "node:timers/promises";
import { fabriquer } from "./clip.mjs";
import { couperPlage, extraireSon } from "./clip/ia.mjs";

const fichierTache = process.argv[2];
const t = JSON.parse(await readFile(fichierTache, "utf8"));
const fichierRendu = join(dirname(fichierTache), "rendu.json");
const YTDLP = process.env.YTDLP || "/usr/local/bin/yt-dlp";
const depart = Date.now();
const journal = (...m) => console.log(((Date.now() - depart) / 1000).toFixed(1).padStart(6), ...m);

async function prevenir(corps) {
  if (!t.suivi) return journal(JSON.stringify(corps));
  for (let i = 1; ; i++) {
    try {
      const rep = await fetch(t.suivi, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${t.jeton}` },
        body: JSON.stringify({ id: t.id, ...corps }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!rep.ok) throw new Error(`suivi refusé (${rep.status})`);
      return;
    } catch (e) {
      journal("suivi :", e?.message || e);
      if (i >= 3) return;
      await attendre(1500 * i);
    }
  }
}
let file = Promise.resolve();
const nouvelle = (corps) => (file = file.then(() => prevenir(corps)));

async function deposer(url, contenu, type) {
  for (let i = 1; ; i++) {
    const rep = await fetch(url, { method: "PUT", headers: { "content-type": type, "x-upsert": "true" }, body: contenu }).catch((e) => ({ ok: false, status: e?.message }));
    if (rep.ok) return;
    if (i >= 3) throw new Error(`dépôt refusé (${rep.status})`);
    await attendre(1500 * i);
  }
}

/** `plage` : ne télécharge que ce passage (secondes), quand la plateforme le permet. */
function telecharger(lien, fichier, surAvancement, plage) {
  return new Promise((ok, ko) => {
    const p = spawn(YTDLP, [
      "--no-warnings", "--no-playlist", "--newline",
      "--progress-template", "download:%(progress._percent_str)s",
      "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/b",
      ...(plage ? ["--download-sections", `*${plage.debut}-${plage.fin}`] : []),
      "--merge-output-format", "mp4", "-o", fichier, lien,
    ]);
    let err = "";
    let dernier = 0;
    p.stdout.on("data", (d) => {
      const m = /([\d.]+)%/.exec(String(d));
      if (!m) return;
      const v = Number(m[1]) / 100;
      if (Math.abs(v - dernier) >= 0.05) {
        dernier = v;
        surAvancement(v);
      }
    });
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("error", ko);
    p.on("close", (c) => (c === 0 ? ok() : ko(new Error(err.trim() || `yt-dlp code ${c}`))));
  });
}

function cause(e) {
  const m = String(e?.message || e);
  if (/not a bot|Sign in to confirm/i.test(m)) return "bloque";
  if (/Unsupported URL|is not a valid URL|No video formats|Unable to extract|HTTP Error 404/i.test(m)) return "illisible";
  if (/Private video|members-only|unavailable|removed/i.test(m)) return "privee";
  if (/trop longue/i.test(m)) return "trop_longue";
  return "autre";
}

const dossier = await mkdtemp(join(tmpdir(), "xpclip-lot-"));
try {
  // 1. La vidéo, puis son son
  // Seulement le passage choisi (20 min au plus). Si la plateforme ne sait pas, la vidéo entière, puis on coupe.
  let source = join(dossier, "source.mp4");
  const avancer = (v) => nouvelle({ phase: "progres", etape: "telechargement", avancement: v });
  if (t.plage) {
    try {
      await telecharger(t.source, source, avancer, t.plage);
      journal("passage récupéré");
    } catch (e) {
      journal("passage seul impossible, vidéo entière :", String(e?.message || e).slice(0, 200));
      const entiere = join(dossier, "entiere.mp4");
      await telecharger(t.source, entiere, avancer);
      await couperPlage(entiere, source, t.plage);
      await rm(entiere, { force: true });
    }
  } else {
    await telecharger(t.source, source, avancer);
  }
  journal("vidéo récupérée");
  const son = join(dossier, "son.mp4");
  await extraireSon(source, son);
  await deposer(t.depotSon, await readFile(son), "video/mp4");
  journal("son déposé");
  await nouvelle({ phase: "son" });
  await file;

  // 2. On attend les moments choisis par XPclip (au plus 6 min)
  let rendu = null;
  for (let i = 0; i < 360 && !rendu; i++) {
    if (existsSync(fichierRendu)) rendu = JSON.parse(await readFile(fichierRendu, "utf8"));
    else await attendre(1000);
  }
  if (!rendu) throw new Error("moments jamais reçus");
  if (rendu.annule) process.exit(0);

  // 3. Les clips, un par un
  for (const [i, moment] of rendu.moments.entries()) {
    nouvelle({ phase: "progres", etape: "montage", avancement: i / rendu.moments.length });
    const sortie = join(dossier, `clip_${i + 1}.mp4`);
    await fabriquer({ source, moment, mots: rendu.mots, sortie, reglages: rendu.reglages });
    await deposer(rendu.depots[i], await readFile(sortie), "video/mp4");
    journal(`clip ${i + 1} déposé`);
    await nouvelle({ phase: "clip", index: i });
  }
  await nouvelle({ phase: "fini" });
} catch (e) {
  journal("échec :", e?.message || e);
  await nouvelle({ phase: "erreur", cause: cause(e), detail: String(e?.message || e).slice(0, 300) });
} finally {
  await file.catch(() => {});
  await rm(dossier, { recursive: true, force: true });
}
