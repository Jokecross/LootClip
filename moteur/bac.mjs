/*
 * Un montage, exécuté dans une machine Vercel Sandbox créée pour lui (voir src/lib/atelier.ts).
 * La machine ne connaît aucune clé secrète : seulement des liens temporaires vers les clips
 * de ce montage, un lien pour déposer la vidéo, et un jeton valable pour ce montage.
 *
 *   node bac.mjs tache.json
 */
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { setTimeout as attendre } from "node:timers/promises";
import { monter } from "./montage.mjs";

const t = JSON.parse(await readFile(process.argv[2], "utf8"));
const depart = Date.now();
const journal = (...m) => console.log(((Date.now() - depart) / 1000).toFixed(1).padStart(6), ...m);

async function essayer(quoi, action, essais = 3) {
  for (let i = 1; ; i++) {
    try {
      return await action();
    } catch (e) {
      journal(`${quoi} : essai ${i} raté (${e?.message || e})`);
      if (i >= essais) throw e;
      await attendre(1500 * i);
    }
  }
}

/** Prévient XPclip. Sans adresse (essai à la main), on écrit seulement dans le journal. */
async function prevenir(corps) {
  if (!t.suivi) return journal(JSON.stringify(corps));
  const rep = await fetch(t.suivi, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${t.jeton}` },
    body: JSON.stringify({ id: t.id, ...corps }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!rep.ok) throw new Error(`suivi refusé (${rep.status})`);
}
// Les nouvelles partent une par une, dans l'ordre : la barre ne recule jamais.
let file = Promise.resolve();
const nouvelle = (corps) => (file = file.then(() => prevenir(corps)).catch((e) => journal("suivi :", e?.message || e)));

/** Le code de la cause, traduit en phrase par le serveur. */
function cause(e) {
  const m = String(e?.message || e);
  if (/^clip introuvable/.test(m)) return "introuvable";
  if (/Invalid data|moov atom|could not find codec|Invalid argument|matches no streams/i.test(m)) return "illisible";
  return "autre";
}

const dossier = await mkdtemp(join(tmpdir(), "xpclip-"));
try {
  // 1. Téléchargement des clips, trois à la fois (2 % → 15 %)
  const fichiers = t.clips.map((c, i) => join(dossier, `clip-${i}${/^\.[a-z0-9]{1,5}$/i.test(extname(c.nom)) ? extname(c.nom) : ".mp4"}`));
  let faits = 0;
  const reste = [...t.clips.keys()];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let i = reste.shift(); i !== undefined; i = reste.shift()) {
        await essayer(`clip ${i + 1}`, async () => {
          const rep = await fetch(t.clips[i].url);
          if (!rep.ok || !rep.body) throw new Error(`clip introuvable (${rep.status})`);
          await pipeline(Readable.fromWeb(rep.body), createWriteStream(fichiers[i]));
        });
        faits++;
        nouvelle({ etape: 0, avancement: 0.02 + (0.13 * faits) / t.clips.length });
      }
    }),
  );
  journal(`${t.clips.length} clip(s) téléchargé(s)`);

  // 2. Montage (15 % → 95 %)
  const sortie = join(dossier, "video.mp4");
  let dernier = 0;
  let derniereEtape = -1;
  const r = await monter({
    clips: fichiers,
    sortie,
    duree: t.duree,
    accroche: t.accroche,
    filigrane: t.filigrane,
    style: t.style,
    format: "zoom",
    progres: (etape, a) => {
      const avancement = 0.15 + a * 0.8;
      if (etape === derniereEtape && avancement - dernier < 0.04 && a < 1) return;
      dernier = avancement;
      derniereEtape = etape;
      nouvelle({ etape: Math.min(3, etape), avancement });
    },
  });
  journal(`montage fini en ${r.secondes.toFixed(1)} s`);

  // 3. Dépôt de la vidéo finie
  const { size } = await stat(sortie);
  const video = await readFile(sortie);
  await essayer("dépôt", async () => {
    const rep = await fetch(t.depot, { method: "PUT", headers: { "content-type": "video/mp4", "x-upsert": "true" }, body: video });
    if (!rep.ok) throw new Error(`dépôt refusé (${rep.status}) ${(await rep.text()).slice(0, 200)}`);
  });
  await file;
  await essayer("fin", () => prevenir({ fini: true, duree: r.duree, taille: size, secondes: (Date.now() - depart) / 1000 }), 5);
  journal(`vidéo déposée : ${r.duree.toFixed(1)} s, ${(size / 1e6).toFixed(1)} Mo`);
} catch (e) {
  journal("échec :", e?.stack || e);
  await file;
  await essayer("échec", () => prevenir({ echec: cause(e), detail: String(e?.message || e).slice(0, 500) }), 5).catch(() => {});
  process.exitCode = 1;
} finally {
  await rm(dossier, { recursive: true, force: true });
}
