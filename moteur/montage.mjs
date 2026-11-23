/*
 * Moteur de montage XPclip.
 * Entrée : 3 à 10 clips de jeu (16:9, n'importe quelle taille).
 * Sortie : une vidéo verticale 1080 × 1920, 30 i/s, de la durée choisie par le joueur (30 s à 3 min).
 *
 * 1. Analyse   : niveau sonore (toutes les 0,5 s) et mouvement à l'image (4 fois par seconde).
 * 2. Sélection : les passages les plus intenses, au moins un par clip, le plus fort en ouverture.
 * 3. Rendu     : découpe, recadrage 9:16 (image entière sur fond flouté par défaut, ou zoom au centre),
 *                accroche écrite les 3 premières secondes, filigrane en offre gratuite,
 *                son du jeu remis au niveau TikTok (-14 LUFS), encodage H.264 + AAC.
 */
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { dessinerAccrocheAnimee, dessinerFiligrane } from "./calques.mjs";

const exec = promisify(execFile);

/** Lance FFmpeg et remonte la part déjà encodée (0 → 1), lue dans la sortie « -progress ». */
function encoder(args, surAvancement, total) {
  return new Promise((ok, ko) => {
    const p = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    let erreurs = "";
    let reste = "";
    p.stderr.on("data", (d) => (erreurs = (erreurs + d).slice(-4000)));
    p.stdout.on("data", (d) => {
      const lignes = (reste + d).split("\n");
      reste = lignes.pop();
      for (const l of lignes) {
        const m = /^out_time_us=(\d+)/.exec(l);
        if (m && total > 0) surAvancement(Math.min(1, Number(m[1]) / 1e6 / total));
      }
    });
    p.on("error", ko);
    p.on("close", (code) => (code === 0 ? ok() : ko(new Error(erreurs.trim() || `FFmpeg s'est arrêté (code ${code})`))));
  });
}
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = process.env.FFPROBE || "ffprobe";

export const REGLAGES = {
  largeur: 1080,
  hauteur: 1920,
  ips: 30,
  dureeMin: 10,
  dureeMax: 180,
  partUtile: 0.85, // on ne garde jamais plus de 85 % du jeu : seulement le meilleur
  pas: 0.5, // finesse de l'analyse, en secondes
  accrocheSec: 3,
};

/* ---------- 1. Analyse ---------- */

async function sonder(fichier) {
  const { stdout } = await exec(FFPROBE, ["-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", fichier]);
  const j = JSON.parse(stdout);
  return { duree: Number(j.format.duration), son: j.streams.some((s) => s.codec_type === "audio") };
}

/** Niveau sonore RMS (dB) toutes les 0,5 s. */
async function niveauxSonores(fichier) {
  const { stderr, stdout } = await exec(
    FFMPEG,
    ["-v", "error", "-i", fichier, "-map", "0:a:0", "-af", "aresample=8000,asetnsamples=n=4000:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const sortie = stdout || stderr;
  const niveaux = [];
  for (const m of sortie.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)) niveaux.push(m[1] === "-inf" ? -90 : Number(m[1]));
  return niveaux;
}

/** Mouvement à l'image (score de changement entre deux images), 4 mesures par seconde. */
async function mouvements(fichier) {
  const { stdout, stderr } = await exec(
    FFMPEG,
    ["-v", "error", "-i", fichier, "-map", "0:v:0", "-vf", "fps=4,scale=192:-2,select='gte(scene\\,0)',metadata=print:key=lavfi.scene_score:file=-", "-an", "-f", "null", "-"],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const sortie = stdout || stderr;
  return [...sortie.matchAll(/scene_score=([\d.]+)/g)].map((m) => Number(m[1]));
}

const borne = (x, a, b) => Math.max(a, Math.min(b, x));

/** Intensité de chaque tranche de 0,5 s : surtout le son (explosions, crashs, tirs), puis le mouvement. */
async function analyser(fichier) {
  const infos = await sonder(fichier);
  const [sons, mvt] = await Promise.all([infos.son ? niveauxSonores(fichier) : Promise.resolve([]), mouvements(fichier)]);
  const n = Math.max(1, Math.floor(infos.duree / REGLAGES.pas));
  const intensite = Array.from({ length: n }, (_, i) => {
    const db = sons[i] ?? -60;
    const son = borne((db + 50) / 40, 0, 1); // -50 dB → 0, -10 dB → 1
    const m = (mvt[i * 2] ?? 0) + (mvt[i * 2 + 1] ?? 0);
    const image = borne(m / 0.25, 0, 1);
    return 0.65 * son + 0.35 * image;
  });
  return { fichier, ...infos, intensite };
}

/* ---------- 2. Sélection des passages ---------- */

/** Passages plus courts pour une vidéo courte (rythme rapide), plus longs pour une vidéo longue. */
const longueurPassage = (duree) => (duree <= 35 ? 2.5 : duree <= 75 ? 4 : 6);

function choisir(analyses, dureeCible) {
  const { pas } = REGLAGES;
  const segment = longueurPassage(dureeCible);
  const fenetre = Math.round(segment / pas);
  // Toutes les fenêtres possibles, avec leur intensité moyenne
  const candidats = analyses.flatMap((a, k) => {
    if (a.duree <= segment + 0.5) return [{ k, debut: 0, fin: a.duree, score: moyenne(a.intensite) }];
    const res = [];
    for (let i = 0; i + fenetre <= a.intensite.length; i++) {
      res.push({ k, debut: i * pas, fin: i * pas + segment, score: moyenne(a.intensite.slice(i, i + fenetre)) });
    }
    return res;
  });
  candidats.sort((x, y) => y.score - x.score);

  const choisis = [];
  const libre = (c) => !choisis.some((s) => s.k === c.k && c.debut < s.fin + 0.5 && c.fin > s.debut - 0.5);
  const total = () => choisis.reduce((t, s) => t + (s.fin - s.debut), 0);

  // Au moins le meilleur passage de chaque clip
  for (let k = 0; k < analyses.length; k++) {
    const c = candidats.find((x) => x.k === k);
    if (c) choisis.push({ ...c });
  }
  // Puis les plus intenses, jusqu'à la durée visée
  for (const c of candidats) {
    if (total() >= dureeCible) break;
    if (libre(c)) choisis.push({ ...c });
  }

  // Pas assez ? On allonge les meilleurs passages avec le jeu qui les entoure, sans chevaucher les autres.
  for (let tour = 0; tour < 200 && total() < dureeCible - 0.2; tour++) {
    let agrandi = false;
    for (const s of [...choisis].sort((a, b) => b.score - a.score)) {
      const manque = dureeCible - total();
      if (manque <= 0.2) break;
      const a = analyses[s.k];
      const voisins = choisis.filter((x) => x !== s && x.k === s.k);
      const plafond = Math.min(a.duree, ...voisins.filter((x) => x.debut >= s.fin).map((x) => x.debut));
      const plancher = Math.max(0, ...voisins.filter((x) => x.fin <= s.debut).map((x) => x.fin));
      const apres = Math.min(1, manque, plafond - s.fin);
      if (apres > 0.05) {
        s.fin += apres;
        agrandi = true;
        continue;
      }
      const avant = Math.min(1, manque, s.debut - plancher);
      if (avant > 0.05) {
        s.debut -= avant;
        agrandi = true;
      }
    }
    if (!agrandi) break;
  }

  // Le plus intense ouvre la vidéo (l'accroche), le reste suit l'ordre des clips et du temps
  const ouverture = choisis.reduce((m, s) => (s.score > m.score ? s : m), choisis[0]);
  const suite = choisis.filter((s) => s !== ouverture).sort((a, b) => a.k - b.k || a.debut - b.debut);

  // Deux passages qui se touchent dans le même clip deviennent un seul plan, sans coupure inutile
  const fusion = [];
  for (const s of suite) {
    const d = fusion.at(-1);
    if (d && d.k === s.k && s.debut - d.fin <= 0.6) d.fin = Math.max(d.fin, s.fin);
    else fusion.push({ ...s });
  }
  const plan = [ouverture, ...fusion];

  // Ajustement fin : on raccourcit le dernier passage si on dépasse
  let surplus = total() - dureeCible;
  for (let i = plan.length - 1; i > 0 && surplus > 0.2; i--) {
    const s = plan[i];
    const retire = Math.min(surplus, s.fin - s.debut - 2);
    if (retire > 0) {
      s.fin -= retire;
      surplus -= retire;
    }
  }
  return plan.map((s) => ({ ...s, duree: s.fin - s.debut }));
}

const moyenne = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

/* ---------- 3. Rendu ---------- */

/**
 * Mouvement de caméra d'un passage (zoompan image par image) :
 * - ouverture : zoom choc (on part serré et on recule vite), puis on avance doucement ;
 * - ensuite : zoom lent, alterné avant / arrière, pour que l'image ne soit jamais figée.
 */
function mouvement(i, s) {
  const n = Math.max(1, Math.round(s.duree * REGLAGES.ips));
  if (i === 0) return `if(lt(on,8),1.32-0.26*on/8,1.06+0.05*(on-8)/${n})`;
  return i % 2 ? `1.08-0.08*on/${n}` : `1+0.08*on/${n}`;
}

function filtreImage(i, format, s) {
  const { largeur: L, hauteur: H, ips } = REGLAGES;
  const z = mouvement(i, s);
  const camera = (l, h) => `zoompan=z='${z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${l}x${h}:fps=${ips}`;
  // Petit flash blanc au début de chaque passage (sauf le premier) : la coupe se sent.
  const flash = i > 0 ? ",fade=t=in:st=0:d=0.12:color=white" : "";
  if (format === "flou") {
    return (
      `[${i}:v]fps=${ips},split=2[f${i}][b${i}];` +
      `[b${i}]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:2,scale=${L}:${H},eq=brightness=-0.10:saturation=1.15[bb${i}];` +
      // On travaille 1,5 fois plus grand pour un zoom fluide, puis on revient à 1080 de large.
      `[f${i}]scale=${L * 1.5}:-2:flags=lanczos,${camera(L, Math.round((L * 9) / 16 / 2) * 2)}[ff${i}];` +
      `[bb${i}][ff${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p${flash}[v${i}];`
    );
  }
  // Zoom : on remplit l'écran en coupant les côtés
  return `[${i}:v]fps=${ips},scale=-2:${Math.round(H * 1.25)}:flags=lanczos,crop=${Math.round(L * 1.25)}:${Math.round(H * 1.25)},${camera(L, H)},setsar=1,format=yuv420p${flash}[v${i}];`;
}

function filtreSon(i, s, son) {
  const fondu = `afade=t=in:d=0.04,afade=t=out:st=${Math.max(0, s.duree - 0.05).toFixed(3)}:d=0.05`;
  if (!son) return `anullsrc=r=48000:cl=stereo,atrim=duration=${s.duree.toFixed(3)}[a${i}];`;
  return `[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,${fondu}[a${i}];`;
}

/**
 * Monte la vidéo.
 * @param {object} o
 * @param {string[]} o.clips   chemins des clips, dans l'ordre déposé
 * @param {string}   o.sortie  chemin du MP4 à écrire
 * @param {number}   o.duree   durée visée en secondes (choisie par le joueur)
 * @param {string}   o.accroche texte des premières secondes (le titre choisi par le joueur)
 * @param {boolean}  o.filigrane offre gratuite
 * @param {"zoom"|"flou"} o.format recadrage vertical
 * @param {(etape:number, avancement:number)=>void} [o.progres]
 */
export async function monter({ clips, sortie, duree = 60, accroche, filigrane = true, format = "flou", progres = () => {} }) {
  const debut = Date.now();
  progres(0, 0.02);
  const analyses = await Promise.all(clips.map(analyser));
  const brut = analyses.reduce((t, a) => t + a.duree, 0);
  const cible = Math.round(borne(duree, REGLAGES.dureeMin, Math.min(REGLAGES.dureeMax, brut * REGLAGES.partUtile)));
  const plan = choisir(analyses, cible);
  progres(0, 0.25);

  const dossier = await mkdtemp(join(tmpdir(), "lootclip-"));
  try {
    // Accroche animée : 12 images d'apparition, puis la dernière tenue 3 s, puis fondu
    const imagesAccroche = accroche ? await dessinerAccrocheAnimee(accroche) : [];
    await Promise.all(imagesAccroche.map((png, k) => writeFile(join(dossier, `accroche_${String(k).padStart(2, "0")}.png`), png)));
    const filigranePng = join(dossier, "filigrane.png");
    if (filigrane) await writeFile(filigranePng, await dessinerFiligrane());
    progres(0, 0.35);

    const args = ["-v", "error", "-y"];
    plan.forEach((s) => args.push("-ss", s.debut.toFixed(3), "-t", s.duree.toFixed(3), "-i", analyses[s.k].fichier));
    let entree = plan.length;
    const idxAccroche = imagesAccroche.length ? entree++ : -1;
    if (idxAccroche >= 0) args.push("-framerate", String(REGLAGES.ips), "-i", join(dossier, "accroche_%02d.png"));
    const idxFiligrane = filigrane ? entree++ : -1;
    if (idxFiligrane >= 0) args.push("-loop", "1", "-i", filigranePng);

    let graphe = "";
    plan.forEach((s, i) => {
      graphe += filtreImage(i, format, s);
      graphe += filtreSon(i, s, analyses[s.k].son);
    });
    graphe += plan.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${plan.length}:v=1:a=1[vc][ac];`;
    let courant = "vc";
    if (idxAccroche >= 0) {
      const apparition = imagesAccroche.length / REGLAGES.ips;
      const finFondu = apparition + REGLAGES.accrocheSec;
      graphe +=
        `[${idxAccroche}:v]format=rgba,tpad=stop_mode=clone:stop_duration=${REGLAGES.accrocheSec},` +
        `fade=t=out:st=${(finFondu - 0.3).toFixed(2)}:d=0.3:alpha=1[acc];` +
        `[${courant}][acc]overlay=0:0:eof_action=pass[oacc];`;
      courant = "oacc";
    }
    if (idxFiligrane >= 0) {
      graphe += `[${courant}][${idxFiligrane}:v]overlay=0:0:shortest=1[ofil];`;
      courant = "ofil";
    }
    graphe += `[ac]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]`;

    args.push(
      "-filter_complex", graphe,
      "-map", `[${courant}]`, "-map", "[aout]",
      "-t", plan.reduce((t, s) => t + s.duree, 0).toFixed(3),
      "-c:v", "libx264", "-preset", process.env.PRESET || "veryfast", "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(REGLAGES.ips),
      "-c:a", "aac", "-b:a", "160k",
      "-movflags", "+faststart",
      "-progress", "pipe:1", "-nostats",
      sortie,
    );
    // L'encodage fait l'essentiel du travail : on suit sa progression réelle (temps encodé / durée finale).
    // Étapes affichées dans l'appli pendant l'encodage : assemblage, puis accroche, puis export.
    const total = plan.reduce((t, s) => t + s.duree, 0);
    progres(1, 0.4);
    await encoder(args, (f) => progres(f < 0.4 ? 1 : f < 0.7 ? 2 : 3, 0.4 + 0.58 * f), total);
    progres(4, 1);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }

  return {
    duree: plan.reduce((t, s) => t + s.duree, 0),
    brut,
    passages: plan.map((s) => ({ clip: s.k, debut: +s.debut.toFixed(1), fin: +s.fin.toFixed(1), intensite: +s.score.toFixed(2) })),
    secondes: (Date.now() - debut) / 1000,
  };
}
