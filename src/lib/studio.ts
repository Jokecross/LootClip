"use client";
/*
 * Réglages du studio de tournage, gardés sur ce téléphone : textes dans localStorage, vidéo finale dans IndexedDB.
 * Rien n'est envoyé au serveur, rien n'est écrit dans un vrai compte.
 */
export type Reglages = { credits: number; pseudo: string; titre: string; secondes: number; /** xpclip.com ouvre le tournage sur cet appareil. */ tournage: boolean };

export const REGLAGES_DEFAUT: Reglages = { credits: 60, pseudo: "", titre: "", secondes: 9, tournage: true };

const MOTS = ["vice", "manette", "pixel", "turbo", "neon", "palmier", "ocean", "minuit"];
const FINS = ["clips", "gaming", "replay", "joue", "ride"];
const hasard = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

/** Un compte inventé pour la démo, avec assez de chiffres pour ne tomber sur personne. */
export const pseudoAuHasard = () => `${hasard(MOTS)}.${hasard(FINS)}${10000 + Math.floor(Math.random() * 90000)}`;

const CLE = "xpclip:studio";

export function lireReglages(): Reglages {
  try {
    const r = { ...REGLAGES_DEFAUT, ...JSON.parse(localStorage.getItem(CLE) || "{}") };
    return r.pseudo === "monpseudo" ? { ...r, pseudo: "" } : r; // ancien réglage par défaut
  } catch {
    return REGLAGES_DEFAUT;
  }
}

export function ecrireReglages(r: Reglages) {
  try {
    localStorage.setItem(CLE, JSON.stringify(r));
  } catch {}
}

function base(): Promise<IDBDatabase> {
  return new Promise((ok, non) => {
    const r = indexedDB.open("xpclip-studio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("f");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => non(r.error);
  });
}

/** On garde les octets plutôt que le fichier : Safari perd parfois les fichiers de la galerie. */
export async function garderVideo(f: Blob, nom: string) {
  const octets = await f.arrayBuffer();
  const b = await base();
  await new Promise<void>((ok, non) => {
    const t = b.transaction("f", "readwrite");
    t.objectStore("f").put({ octets, type: f.type || "video/mp4", nom }, "finale");
    t.oncomplete = () => ok();
    t.onerror = () => non(t.error);
  });
}

export async function lireVideo(): Promise<{ url: string; nom: string } | null> {
  try {
    const b = await base();
    const v = await new Promise<{ octets: ArrayBuffer; type: string; nom: string } | undefined>((ok, non) => {
      const r = b.transaction("f").objectStore("f").get("finale");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => non(r.error);
    });
    return v ? { url: URL.createObjectURL(new Blob([v.octets], { type: v.type })), nom: v.nom } : null;
  } catch {
    return null;
  }
}
