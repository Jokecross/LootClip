/*
 * « Lien → clips » en local : le moteur tourne sur le Mac (moteur/url.mjs), lancé par le serveur Next.
 * Réservé au mode local (npm run dev, ou next start avec STUDIO_LOCAL=1), jamais sur Vercel.
 * La version en ligne passera par la machine de montage.
 */
import "server-only";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OptionsClips } from "./clips-options";

export const clipsLocaux = () => process.env.NODE_ENV !== "production" || process.env.STUDIO_LOCAL === "1";

const RACINE = join(tmpdir(), "xpclip-clips");
const ID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const FICHIER_CLIP = /^clip_\d{1,2}\.mp4$/;

export const dossierDe = (id: string) => (ID.test(id) ? join(RACINE, id) : null);

export type EtatClips = {
  etape: "telechargement" | "transcription" | "choix" | "montage" | "fini";
  avancement: number;
  moments: { titre: string; score: number; duree: number }[];
  clips: { fichier: string; titre: string; score: number; duree: number; url?: string }[];
  erreur: string | null;
  debut: number;
};

/** Lance le moteur et rend la main tout de suite : l'écran suit l'avancement avec lireEtat. */
export async function lancer(lien: string, options: OptionsClips) {
  const id = randomUUID();
  const dossier = join(RACINE, id);
  await mkdir(dossier, { recursive: true });
  const moteur = join(process.cwd(), "moteur", "url.mjs");
  const { nombre, ...reglages } = options;
  const p = spawn(process.execPath, [moteur, lien, dossier, String(nombre), "--etat", join(dossier, "etat.json"), "--options", JSON.stringify(reglages)], {
    cwd: join(process.cwd(), "moteur"),
    detached: true,
    stdio: "ignore",
  });
  p.unref();
  return id;
}

export async function lireEtat(id: string): Promise<EtatClips | null> {
  const dossier = dossierDe(id);
  if (!dossier) return null;
  try {
    return JSON.parse(await readFile(join(dossier, "etat.json"), "utf8"));
  } catch {
    return null; // pas encore écrit : le moteur démarre
  }
}

/** Les lots déjà lancés sur ce Mac, du plus récent au plus ancien. */
export async function listerLots() {
  const dossiers = await readdir(RACINE).catch(() => [] as string[]);
  const lots = await Promise.all(dossiers.filter((d) => ID.test(d)).map(async (id) => ({ id, etat: await lireEtat(id) })));
  return lots
    .filter((l): l is { id: string; etat: EtatClips } => Boolean(l.etat))
    .sort((a, b) => (b.etat.debut ?? 0) - (a.etat.debut ?? 0))
    .map(({ id, etat }) => ({ id, debut: etat.debut, etape: etat.etape, erreur: etat.erreur, clips: etat.clips.map((c) => ({ ...c, url: `/api/clips/${id}/${c.fichier}` })) }));
}
