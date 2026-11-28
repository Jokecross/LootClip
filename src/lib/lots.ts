"use client";
/*
 * Les vidéos analysées (« lots ») du compte, partagées par l'Accueil, Mes clips et le Calendrier.
 * Une seule lecture pour toute l'appli : gardée en mémoire, relue au retour sur l'onglet,
 * et toutes les 5 secondes tant qu'une vidéo est en cours d'analyse.
 */
import { useCallback, useEffect, useState } from "react";

export type ClipLot = { fichier: string; titre: string; score?: number; duree: number; url?: string };
export type Lot = {
  id: string;
  debut: number;
  etape: "telechargement" | "transcription" | "choix" | "montage" | "fini";
  avancement?: number;
  erreur: string | null;
  clips: ClipLot[];
  moments?: number;
  lien?: string | null;
  plage?: { debut: number; fin: number } | null;
  nombre?: number | null;
};

const ETAPES = [
  { cle: "telechargement", nom: "Récupération de la vidéo", poids: [0, 0.25] },
  { cle: "transcription", nom: "Écoute de la vidéo", poids: [0.25, 0.35] },
  { cle: "choix", nom: "Choix des meilleurs moments", poids: [0.35, 0.45] },
  { cle: "montage", nom: "Montage des clips", poids: [0.45, 1] },
] as const;

export const enCours = (l: Lot) => !l.erreur && l.etape !== "fini";
export const nomEtape = (l: Lot) => ETAPES.find((e) => e.cle === l.etape)?.nom ?? "Préparation";
export function avancementLot(l: Lot) {
  if (l.etape === "fini") return 1;
  const e = ETAPES.find((x) => x.cle === l.etape) ?? ETAPES[0];
  return e.poids[0] + (e.poids[1] - e.poids[0]) * Math.min(1, l.avancement ?? 0);
}

export async function enTetes(): Promise<Record<string, string>> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

export const lienTelechargement = (c: ClipLot) => (c.url?.startsWith("/") ? `${c.url}?telecharger` : `${c.url}&download=xpclip-${c.fichier}`);

/** Un clip publiable en ligne (pas en mode local). */
export const publiable = (c: ClipLot) => Boolean(c.url && !c.url.startsWith("/"));

let memoire: Lot[] | null = null;
const abonnes = new Set<(l: Lot[]) => void>();
let lecture: Promise<void> | null = null;

export function relireLots() {
  lecture ??= (async () => {
    const rep = await fetch("/api/clips", { cache: "no-store", headers: await enTetes() }).catch(() => null);
    const d = rep?.ok ? ((await rep.json().catch(() => null)) as { lots: Lot[] } | null) : null;
    if (d) {
      memoire = d.lots;
      abonnes.forEach((f) => f(d.lots));
    } else if (!memoire) {
      memoire = [];
      abonnes.forEach((f) => f([]));
    }
  })().finally(() => {
    lecture = null;
  });
  return lecture;
}

export function useLots() {
  const [lots, setLots] = useState<Lot[] | null>(memoire);
  useEffect(() => {
    abonnes.add(setLots);
    relireLots();
    const auRetour = () => !document.hidden && relireLots();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      abonnes.delete(setLots);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, []);
  const actifs = lots?.some(enCours) ?? false;
  useEffect(() => {
    if (!actifs) return;
    const id = setInterval(() => !document.hidden && relireLots(), 5000);
    return () => clearInterval(id);
  }, [actifs]);
  return { lots, relire: useCallback(() => relireLots(), []) };
}

/* ---------- Titre et miniature d'un lien (YouTube, Twitch, Kick, X), gardés pour la session ---------- */

export type Apercu = { plateforme: string; titre: string | null; miniature: string | null; auteur: string | null };
const apercus = new Map<string, Promise<Apercu | null>>();

function lireApercu(lien: string) {
  if (!apercus.has(lien)) {
    apercus.set(
      lien,
      (async () => {
        try {
          const garde = sessionStorage.getItem(`xpclip:apercu:${lien}`);
          if (garde) return JSON.parse(garde) as Apercu;
        } catch {}
        const r = await fetch(`/api/apercu?url=${encodeURIComponent(lien)}`).catch(() => null);
        const a = r?.ok ? ((await r.json().catch(() => null)) as Apercu | null) : null;
        try {
          if (a) sessionStorage.setItem(`xpclip:apercu:${lien}`, JSON.stringify(a));
        } catch {}
        return a;
      })(),
    );
  }
  return apercus.get(lien)!;
}

export function useApercu(lien?: string | null) {
  const [a, setA] = useState<Apercu | null>(null);
  useEffect(() => {
    if (!lien) return;
    let fini = false;
    lireApercu(lien).then((x) => !fini && setA(x));
    return () => {
      fini = true;
    };
  }, [lien]);
  return a;
}

export function plateformeDe(lien?: string | null) {
  if (!lien) return "Fichier";
  const l = lien.toLowerCase();
  if (/youtu\.?be/.test(l)) return "YouTube";
  if (l.includes("twitch.tv")) return "Twitch";
  if (l.includes("kick.com")) return "Kick";
  if (/\/\/(www\.)?(x|twitter)\.com/.test(l)) return "X";
  return "Lien";
}

/** « il y a 5 min », « hier », « 12 nov. » */
export function ilYa(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 172_800) return "hier";
  return new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
