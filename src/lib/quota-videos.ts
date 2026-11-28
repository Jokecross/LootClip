"use client";
/*
 * Le quota de vidéos du mois, lu sur le serveur (le vrai compteur des analyses en ligne).
 * Relu à l'ouverture, au retour sur l'onglet, chaque minute, et après chaque lancement (événement « xpclip:quota »).
 * Sur le Mac (mode local) ou sans réponse : le calcul local (anciens montages) prend le relais.
 */
import { useEffect, useState } from "react";
import type { Etat } from "./etat";
import { quota } from "./montage";

export type Quota = { utilise: number; total: number; restant: number; periode: string; /** Heures du mois, en secondes (null : inconnues, mode local). */ secondes: number | null; secondesTotal: number | null };

export const relireQuota = () => window.dispatchEvent(new Event("xpclip:quota"));

export function useQuotaVideos(etat: Etat): Quota {
  const local: Quota = { ...quota(etat), secondes: null, secondesTotal: null };
  const [serveur, setServeur] = useState<Quota | null>(null);
  const actif = Boolean(etat.compte) && etat.compte?.offre !== "gratuit";
  useEffect(() => {
    if (!actif) return;
    let fini = false;
    const lire = async () => {
      const { supabase } = await import("./supabase");
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!data.session) return;
      const r = await fetch("/api/clips/quota", { cache: "no-store", headers: { authorization: `Bearer ${data.session.access_token}` } }).catch(() => null);
      const j = r?.ok ? await r.json().catch(() => null) : null;
      if (!fini && j && typeof j.utilise === "number") setServeur({ utilise: j.utilise, total: j.total, restant: j.restant, periode: "ce mois-ci", secondes: j.secondes ?? null, secondesTotal: j.secondesTotal ?? null });
    };
    lire();
    const id = setInterval(lire, 60_000);
    window.addEventListener("focus", lire);
    window.addEventListener("xpclip:quota", lire);
    return () => {
      fini = true;
      clearInterval(id);
      window.removeEventListener("focus", lire);
      window.removeEventListener("xpclip:quota", lire);
    };
  }, [actif]);
  return serveur ?? local;
}
