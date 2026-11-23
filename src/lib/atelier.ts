/*
 * L'atelier : une machine Vercel Sandbox par montage.
 * - Une machine « base » garde FFmpeg et le moteur déjà installés. Son nom contient l'empreinte
 *   du moteur : dès que le moteur change, une nouvelle base se prépare toute seule.
 * - Chaque montage en prend une copie, ou une machine neuve si la base n'est pas encore prête.
 * - La machine ne reçoit que des liens temporaires, jamais la clé secrète, et ne peut joindre
 *   que Supabase et XPclip.
 */
import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FICHIERS = ["montage.mjs", "calques.mjs", "bac.mjs", "bac.sh", "package.json", "package-lock.json", "polices/Bricolage-ExtraBold.ttf"];
const DOSSIER = "/vercel/sandbox/moteur";
const REGION = "cdg1";
const PREFIXE_BASE = "xpclip-base-";
export const DELAI_MAX_MIN = 25;

type Tache = {
  id: string;
  clips: { nom: string; url: string }[];
  depot: string;
  duree: number;
  accroche: string;
  filigrane: boolean;
  suivi?: string;
  jeton?: string;
};

async function moteur() {
  const racine = join(process.cwd(), "moteur");
  const fichiers = await Promise.all(FICHIERS.map(async (f) => ({ path: `${DOSSIER}/${f}`, content: await readFile(join(racine, f)) })));
  const h = createHash("sha256");
  for (const f of fichiers) h.update(f.path).update(f.content);
  return { fichiers, base: PREFIXE_BASE + h.digest("hex").slice(0, 12) };
}

/** Jeton d'un montage : signé avec la clé du serveur, il ne vaut que pour cet essai de ce montage. */
export function jetonMontage(id: string, debutLe: string) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`montage:${id}:${new Date(debutLe).getTime()}`).digest("hex");
}
export function jetonValide(recu: string, id: string, debutLe: string) {
  const a = Buffer.from(recu);
  const b = Buffer.from(jetonMontage(id, debutLe));
  return a.length === b.length && timingSafeEqual(a, b);
}

const nomMachine = (id: string) => `xpclip-${id}`;

/** Démarre le montage et rend la main tout de suite : la machine préviendra XPclip de la suite. */
export async function demarrer(tache: Tache, hotes: string[]) {
  const { fichiers, base } = await moteur();
  const reglages = { name: nomMachine(tache.id), persistent: false, region: REGION, resources: { vcpus: 4 }, timeout: DELAI_MAX_MIN * 60_000 };

  let machine: Sandbox;
  let prete = false;
  const modele = await Sandbox.get({ name: base }).catch(() => null);
  if (modele?.currentSnapshotId) {
    machine = await Sandbox.fork({ sourceSandbox: base, ...reglages, networkPolicy: { allow: hotes } });
    prete = true;
  } else {
    machine = await Sandbox.create({ image: "vercel/sandbox/node:24", ...reglages });
  }
  try {
    if (!prete) {
      await machine.mkDir(DOSSIER).catch(() => {});
      await machine.mkDir(`${DOSSIER}/polices`).catch(() => {});
      await machine.writeFiles(fichiers);
    }
    await machine.writeFiles([{ path: `${DOSSIER}/tache.json`, content: JSON.stringify(tache), mode: 0o600 }]);
    await machine.runCommand({ cmd: "bash", args: [`${DOSSIER}/bac.sh`, "tache.json"], detached: true });
  } catch (e) {
    await machine.delete().catch(() => {}); // sinon la machine tournerait à vide jusqu'au délai
    throw e;
  }
  return { prete };
}

/** Prépare la base du moteur actuel (une fois par version), et jette les anciennes. */
export async function preparerBase() {
  const { fichiers, base } = await moteur();
  const existante = await Sandbox.get({ name: base }).catch(() => null);
  if (existante?.currentSnapshotId) return { base, creee: false };
  // Une base en préparation depuis moins de 10 min : quelqu'un d'autre s'en occupe.
  if (existante) {
    if (Date.now() - new Date(existante.createdAt).getTime() < 10 * 60_000) return { base, creee: false };
    await existante.delete();
  }
  const machine = await Sandbox.create({
    name: base,
    image: "vercel/sandbox/node:24",
    region: REGION,
    resources: { vcpus: 4 },
    timeout: 5 * 60_000,
    snapshotExpiration: 0,
    keepLastSnapshots: { count: 1, deleteEvicted: true },
  });
  await machine.mkDir(DOSSIER).catch(() => {});
  await machine.mkDir(`${DOSSIER}/polices`).catch(() => {});
  await machine.writeFiles(fichiers);
  const cmd = await machine.runCommand("bash", [`${DOSSIER}/bac.sh`]);
  if (cmd.exitCode !== 0) {
    const err = await cmd.stderr();
    await machine.delete().catch(() => {});
    throw new Error(`préparation de la base : ${err.slice(-500)}`);
  }
  await machine.stop(); // l'arrêt enregistre la machine : c'est le modèle à copier
  for await (const s of await Sandbox.list({ namePrefix: PREFIXE_BASE, sortBy: "name" })) {
    if (s.name !== base) await Sandbox.get({ name: s.name }).then((x) => x.delete()).catch(() => {});
  }
  return { base, creee: true };
}

/** Éteint la machine d'un montage terminé : on ne paie que le temps utile. */
export async function eteindre(id: string) {
  const m = await Sandbox.get({ name: nomMachine(id) }).catch(() => null);
  const usage = m ? await m.stop().catch(() => null) : null;
  await m?.delete().catch(() => {});
  return usage;
}
