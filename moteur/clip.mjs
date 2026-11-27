#!/usr/bin/env node
/*
 * Moteur « URL → clips » de XPclip (prototype local).
 *
 *   node clip.mjs <source.mp4> <moments.json> <dossier-sortie>
 *
 * moments.json : [{ "titre": "Accroche écrite", "parties": [[debut, fin], ...] }, ...]  (secondes)
 * Pour chaque moment, une vidéo 1080 × 1920 à 30 i/s :
 *   1. on assemble les parties (coupes franches) ;
 *   2. mots du passage : transcription Groq de la vidéo entière, sinon Whisper sur la machine ;
 *   3. on cadre en 9:16 sur le visage de chaque plan ;
 *   4. on pose l'accroche 3 s en haut et les sous-titres mot à mot ;
 *   5. son remis au niveau TikTok (-14 LUFS).
 *
 * Outils attendus : ffmpeg, whisper-cli + modèle, python avec opencv (voir clip/visages.py).
 */
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { dessinerAccrocheAnimee } from "./calques.mjs";
import { motsDuMoment } from "./clip/ia.mjs";
import { BANDE, chronologie, grouper } from "./clip/sous-titres.mjs";

const exec = promisify(execFile);
const ICI = dirname(fileURLToPath(import.meta.url));
const MODELES = join(homedir(), ".xpclip-modeles");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const WHISPER = process.env.WHISPER || "whisper-cli";
const MODELE_WHISPER = process.env.MODELE_WHISPER || join(MODELES, "ggml-large-v3-turbo-q5_0.bin");
const PYTHON = process.env.PYTHON || join(MODELES, "venv", "bin", "python");
const MODELE_VISAGES = process.env.MODELE_VISAGES || join(MODELES, "yunet.onnx");

const IPS = 30;
const Y_SOUS_TITRES = 1150; // haut de la bande des sous-titres (sous le visage, au-dessus du texte TikTok)
// Placement choisi par le joueur : haut de la bande des sous-titres (la bande fait BANDE px)
const Y_PLACEMENT = { haut: 210, milieu: 750, bas: 1190 };
const COULEURS = { jaune: "#F9D477", rose: "#F05FA5", turquoise: "#6FE3D6", orange: "#F2934F", blanc: "#FFFFFF" };
export const REGLAGES_PAR_DEFAUT = { couleur: "jaune", placement: "auto", format: "auto", accroche: true };
const ACCROCHE_SEC = 3;

const journal = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

function lancer(bin, args) {
  return new Promise((ok, ko) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-4000)));
    p.on("error", ko);
    p.on("close", (c) => (c === 0 ? ok() : ko(new Error(err.trim() || `${bin} code ${c}`))));
  });
}

/** 1. Assemble les parties du moment en une vidéo horizontale propre. */
async function assembler(source, parties, sortie) {
  const args = ["-v", "error", "-y"];
  parties.forEach(([a, b]) => args.push("-ss", a.toFixed(3), "-to", b.toFixed(3), "-i", source));
  const n = parties.length;
  const graphe =
    parties.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,fps=${IPS}[v${i}];[${i}:a]asetpts=PTS-STARTPTS,afade=t=in:d=0.02,areverse,afade=t=in:d=0.02,areverse[a${i}];`).join("") +
    parties.map((_, i) => `[v${i}][a${i}]`).join("") +
    `concat=n=${n}:v=1:a=1[v][a]`;
  args.push("-filter_complex", graphe, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-c:a", "pcm_s16le", sortie);
  await lancer(FFMPEG, args);
}

/** 2. Mots et leurs instants, relus par Whisper sur le passage assemblé. */
async function retranscrire(video, dossier) {
  const wav = join(dossier, "son.wav");
  await lancer(FFMPEG, ["-v", "error", "-y", "-i", video, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);
  const base = join(dossier, "mots");
  await exec(WHISPER, ["-m", MODELE_WHISPER, "-f", wav, "-l", "fr", "-ojf", "-of", base, "-np", "-t", "8"], { maxBuffer: 1 << 26 });
  const segments = JSON.parse(await readFile(`${base}.json`, "utf8")).transcription;

  const mots = [];
  for (const s of segments) {
    for (const tk of s.tokens) {
      if (tk.text.startsWith("[_")) continue;
      const debut = tk.offsets.from / 1000;
      if (tk.text.startsWith(" ") || !mots.length) mots.push({ texte: tk.text.trim(), debut, fin: tk.offsets.to / 1000 });
      else {
        mots.at(-1).texte += tk.text;
        mots.at(-1).fin = tk.offsets.to / 1000;
      }
    }
  }
  // Ponctuation seule (« , » « ? ») collée au mot d'avant
  const propres = [];
  for (const m of mots) {
    if (/^[\p{P}\s]+$/u.test(m.texte) && propres.length) propres.at(-1).texte += m.texte;
    else if (m.texte) propres.push(m);
  }
  // Mots tassés au même instant : on les répartit jusqu'au mot suivant
  for (let i = 0; i < propres.length; ) {
    let j = i;
    while (j + 1 < propres.length && Math.abs(propres[j + 1].debut - propres[i].debut) < 0.01) j++;
    if (j > i) {
      const fin = j + 1 < propres.length ? propres[j + 1].debut : propres[j].fin;
      const pas = Math.max(0.12, (fin - propres[i].debut) / (j - i + 1));
      for (let k = i; k <= j; k++) propres[k].debut = propres[i].debut + pas * (k - i);
    }
    i = j + 1;
  }
  for (let i = 0; i < propres.length; i++) {
    const suivant = propres[i + 1];
    propres[i].fin = suivant ? Math.min(Math.max(propres[i].fin, propres[i].debut + 0.12), suivant.debut) : propres[i].fin;
  }
  return propres;
}

/** 3. Plans et cadre horizontal de chacun. */
async function cadrer(video) {
  const { stdout } = await exec(PYTHON, [join(ICI, "clip", "visages.py"), video, MODELE_VISAGES], { maxBuffer: 1 << 24 });
  return JSON.parse(stdout);
}

async function sonder(video) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video]);
  const j = JSON.parse(stdout);
  return { l: j.streams[0].width, h: j.streams[0].height, duree: Number(j.format.duration) };
}

/** 4 et 5. Rendu final. */
async function rendre({ brut, plans: plansDetectes, mots, titre, sortie, dossier, reglages = REGLAGES_PAR_DEFAUT }) {
  const { l, h, duree } = await sonder(brut);
  const cl = Math.round((h * 9) / 16 / 2) * 2; // largeur du cadre 9:16 dans la source
  const xDe = (cx) => Math.round(Math.min(l - cl, Math.max(0, cx * l - cl / 2)));
  const r = { ...REGLAGES_PAR_DEFAUT, ...reglages };

  // Format imposé par le joueur : plein écran (un cadre 9:16 par plan) ou image entière sur fond flou
  const plans = plansDetectes.map((p) => {
    if (r.format === "flou") return { ...p, mise: "flou" };
    if (r.format === "plein" && p.mise !== "seul" && p.mise !== "jeu") return { ...p, mise: "seul", cx: p.mise === "duo" ? (p.duo[0][0] + p.duo[1][0]) / 2 : 0.5 };
    return p;
  });

  // Sous-titres : une image par état, enchaînées avec leur durée
  const avecSousTitres = r.couleur !== "aucun" && mots.length > 0;
  const etapes = avecSousTitres ? chronologie(grouper(mots), duree, COULEURS[r.couleur] ?? COULEURS.jaune) : [];
  const liste = [];
  for (let k = 0; k < etapes.length; k++) {
    const f = join(dossier, `st_${String(k).padStart(4, "0")}.png`);
    await writeFile(f, await etapes[k].png());
    liste.push(`file '${f}'\nduration ${etapes[k].duree.toFixed(4)}`);
  }
  if (etapes.length) {
    liste.push(`file '${join(dossier, `st_${String(etapes.length - 1).padStart(4, "0")}.png`)}'`);
    await writeFile(join(dossier, "st.txt"), liste.join("\n") + "\n");
  }

  // Vidéo de jeu avec facecam : l'accroche passe sous la facecam pour ne pas cacher le visage
  const dureeStream = plans.filter((p) => p.mise === "stream").reduce((t, p) => t + (p.fin - p.debut), 0);
  const yAccroche = r.placement === "haut" ? 1260 : dureeStream > duree / 2 ? 650 : 300;
  const avecAccroche = r.accroche && Boolean(titre);
  const accroche = avecAccroche ? await dessinerAccrocheAnimee(titre, 12, yAccroche) : [];
  await Promise.all(accroche.map((png, k) => writeFile(join(dossier, `acc_${String(k).padStart(2, "0")}.png`), png)));
  const finFondu = accroche.length / IPS + ACCROCHE_SEC;

  // Un flux par plan (entrées séparées : pas de mise en mémoire des plans à venir)
  const borne = (v, a, b) => Math.round(Math.min(b, Math.max(a, v)));
  const chD = Math.round((h * 0.5) / 2) * 2; // duo : chaque moitié est un cadre 9:8
  const cwD = Math.round((chD * 9) / 8 / 2) * 2;
  const HAUT_CAM = 608; // stream : facecam 16:9 en haut (1080 × 608), jeu dessous (1080 × 1312)
  const cwJ = Math.round((h * 1080) / (1920 - HAUT_CAM) / 2) * 2;
  const entrees = [];
  let graphe = "";
  plans.forEach((p, i) => {
    const fin = i === plans.length - 1 ? duree : p.fin;
    entrees.push("-ss", p.debut.toFixed(3), "-t", (fin - p.debut).toFixed(3), "-i", brut);
    const v = `[${i}:v]setpts=PTS-STARTPTS,fps=${IPS}`;
    if (p.mise === "duo") {
      const [[x1, y1], [x2, y2]] = p.duo.map(([cx, cy]) => [borne(cx * l - cwD / 2, 0, l - cwD), borne(cy * h - chD * 0.42, 0, h - chD)]);
      graphe +=
        `${v},split[d${i}a][d${i}b];` +
        `[d${i}a]crop=${cwD}:${chD}:${x1}:${y1},scale=1080:960:flags=lanczos[h${i}];` +
        `[d${i}b]crop=${cwD}:${chD}:${x2}:${y2},scale=1080:960:flags=lanczos[b${i}];` +
        `[h${i}][b${i}]vstack,setsar=1[p${i}];`;
    } else if (p.mise === "stream") {
      const [cx, cy, cw, ch] = p.cam;
      const camG = cx * l;
      const camD = (cx + cw) * l;
      let xj = (l - cwJ) / 2;
      if (cx + cw / 2 < 0.5 && xj < camD) xj = camD; // facecam à gauche : le jeu ne la reprend pas
      if (cx + cw / 2 >= 0.5 && xj + cwJ > camG) xj = camG - cwJ;
      xj = borne(xj, 0, l - cwJ);
      const [fx, fy, fl, fh] = [cx * l, cy * h, cw * l, ch * h].map((v) => Math.round(v / 2) * 2);
      graphe +=
        `${v},split[c${i}a][c${i}b];` +
        `[c${i}a]crop=${fl}:${fh}:${fx}:${fy},scale=1080:${HAUT_CAM}:flags=lanczos,setsar=1[h${i}];` +
        `[c${i}b]crop=${cwJ}:${h}:${xj}:0,scale=1080:${1920 - HAUT_CAM}:flags=lanczos,setsar=1[b${i}];` +
        `[h${i}][b${i}]vstack,setsar=1[p${i}];`;
    } else if (p.mise === "flou") {
      // Fond : l'image agrandie, réduite pour flouter vite, puis remise à la taille ; devant : l'image entière
      graphe +=
        `${v},split[f${i}a][f${i}b];` +
        `[f${i}a]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:2,eq=brightness=-0.06,scale=1080:1920[bg${i}];` +
        `[f${i}b]scale=1080:-2:flags=lanczos[fg${i}];` +
        `[bg${i}][fg${i}]overlay=0:(H-h)/2,setsar=1[p${i}];`;
    } else {
      graphe += `${v},crop=${cl}:${h}:${xDe(p.cx)}:0,scale=1080:1920:flags=lanczos,setsar=1[p${i}];`;
    }
  });
  const n = plans.length;
  graphe += plans.map((_, i) => `[p${i}]`).join("") + `concat=n=${n}:v=1:a=0,unsharp=5:5:0.5[cadre];`;

  // Sous-titres : placement choisi, sinon sous le visage en plan seul, entre les deux visages en duo,
  // sous l'image en image entière
  const finDe = (p) => (p === plans.at(-1) ? duree : p.fin).toFixed(3);
  let yST;
  if (r.placement !== "auto") yST = String(Y_PLACEMENT[r.placement] ?? Y_SOUS_TITRES);
  else if (r.format === "flou") yST = String(1250);
  else {
    const enDuo = plans.filter((p) => p.mise === "duo").map((p) => `between(t\\,${p.debut.toFixed(3)}\\,${finDe(p)})`);
    yST = enDuo.length ? `if(${enDuo.join("+")}\\,${960 - BANDE / 2}\\,${Y_SOUS_TITRES})` : String(Y_SOUS_TITRES);
  }

  // Entrées : plans, son, puis sous-titres et accroche s'il y en a
  let suivante = n + 1;
  const iST = avecSousTitres ? suivante++ : -1;
  const iAcc = avecAccroche ? suivante++ : -1;
  let courant = "cadre";
  if (iST >= 0) {
    graphe += `[${iST}:v]format=rgba,fps=${IPS}[st];[${courant}][st]overlay=x=0:y='${yST}':eval=frame:eof_action=pass[o1];`;
    courant = "o1";
  }
  if (iAcc >= 0) {
    graphe +=
      `[${iAcc}:v]format=rgba,tpad=stop_mode=clone:stop_duration=${ACCROCHE_SEC},fade=t=out:st=${(finFondu - 0.3).toFixed(2)}:d=0.3:alpha=1[acc];` +
      `[${courant}][acc]overlay=0:0:eof_action=pass[o2];`;
    courant = "o2";
  }
  graphe += `[${courant}]format=yuv420p[v];[${n}:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`;
  await lancer(FFMPEG, [
    "-v", "error", "-y",
    ...entrees,
    "-i", brut,
    ...(avecSousTitres ? ["-f", "concat", "-safe", "0", "-i", join(dossier, "st.txt")] : []),
    ...(avecAccroche ? ["-framerate", String(IPS), "-i", join(dossier, "acc_%02d.png")] : []),
    "-filter_complex", graphe,
    "-map", "[v]", "-map", "[a]", "-t", duree.toFixed(3),
    "-c:v", "libx264", "-preset", process.env.PRESET || "medium", "-crf", "19", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
    sortie,
  ]);
}

/**
 * Un clip à partir d'un moment. `mots` (facultatif) : mots de la vidéo entière déjà transcrite
 * (Groq) ; sinon le passage est retranscrit sur la machine avec Whisper.
 */
export async function fabriquer({ source, moment, mots: motsSource, sortie, reglages }) {
  const dossier = await mkdtemp(join(tmpdir(), "xpclip-clip-"));
  try {
    const brut = join(dossier, "brut.mov");
    await assembler(source, moment.parties, brut);
    const [mots, plans] = await Promise.all([
      motsSource ? motsDuMoment(motsSource, moment.parties) : retranscrire(brut, dossier),
      cadrer(brut),
    ]);
    await rendre({ brut, plans, mots, titre: moment.titre, sortie, dossier, reglages });
    return { mots: mots.length, plans };
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

async function principal() {
  const [source, fichierMoments, dossierSortie] = process.argv.slice(2);
  if (!source || !fichierMoments || !dossierSortie) {
    console.error("Usage : node clip.mjs <source.mp4> <moments.json> <dossier-sortie>");
    process.exit(1);
  }
  const moments = JSON.parse(await readFile(fichierMoments, "utf8"));
  await mkdir(dossierSortie, { recursive: true });
  for (const [i, m] of moments.entries()) {
    journal(`clip_${i + 1}.mp4 : « ${m.titre} »`);
    const r = await fabriquer({ source, moment: m, sortie: join(dossierSortie, `clip_${i + 1}.mp4`) });
    journal(`  ${r.mots} mots, ${r.plans.length} plans`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
