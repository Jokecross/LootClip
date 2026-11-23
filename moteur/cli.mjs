#!/usr/bin/env node
/*
 * Montage en local, pour régler la qualité.
 *   node cli.mjs --accroche "Mon titre" [--duree 30|60|180] [--format flou|zoom] [--pro] [--sortie video.mp4] clip1.mp4 ...
 * Sans clip donné : prend tous les .mp4 du dossier ../CLIP.
 */
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { monter } from "./montage.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  if (i === -1) return defaut;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const drapeau = (nom) => {
  const i = args.indexOf(`--${nom}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

const accroche = option("accroche", "J'ai tenté le défi le plus bête de GTA 6.");
const format = option("format", "flou");
const duree = Number(option("duree", "60"));
const sortie = resolve(option("sortie", join(ICI, "sorties", `montage-${format}-${duree}s.mp4`)));
const pro = drapeau("pro");

let clips = args.map((c) => resolve(c));
if (!clips.length) {
  const dossier = join(ICI, "..", "CLIP");
  clips = (await readdir(dossier)).filter((f) => /\.(mp4|mov|m4v)$/i.test(f)).sort().map((f) => join(dossier, f));
}

const { mkdir } = await import("node:fs/promises");
await mkdir(dirname(sortie), { recursive: true });

console.log(`Montage de ${clips.length} clips (${format}${pro ? ", sans filigrane" : ""})…`);
const r = await monter({
  clips,
  sortie,
  duree,
  accroche,
  format,
  filigrane: !pro,
  progres: (e, a) => process.stdout.write(`  étape ${e} · ${Math.round(a * 100)} %\n`),
});
console.log(`Terminé en ${r.secondes.toFixed(1)} s → ${sortie}`);
console.log(`Vidéo de ${r.duree.toFixed(1)} s, à partir de ${r.brut.toFixed(1)} s de clips.`);
console.table(r.passages);
