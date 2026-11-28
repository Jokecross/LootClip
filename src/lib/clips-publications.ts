"use client";
/*
 * Le lien entre un clip (lot + fichier) et ses publications.
 * Un clip posté devient une ligne « montages » (pris_par = clips) dont video_chemin = lots/<user>/<lot>/<fichier>.
 */
import { useMemo } from "react";
import { useEtat } from "./etat";
import { usePublications, type Publication } from "./publication";

export type StatutClip = "a_poster" | "programme" | "publie";
export const cleClip = (lot: string, fichier: string) => `${lot}/${fichier}`;

export function statutDesPublications(pubs: Publication[]): StatutClip {
  if (pubs.some((p) => p.statut === "publiee")) return "publie";
  if (pubs.some((p) => ["programmee", "envoi", "en_cours"].includes(p.statut))) return "programme";
  return "a_poster";
}

/** Toutes les publications, et pour chaque clip celles qui le concernent. */
export function usePublicationsDesClips() {
  const etat = useEtat();
  const { liste, relire } = usePublications();
  const parClip = useMemo(() => {
    const m = new Map<string, Publication[]>();
    if (!liste) return m;
    const cheminDe = new Map(etat.videos.filter((v) => v.videoChemin).map((v) => [v.id, v.videoChemin!]));
    for (const p of liste) {
      const c = cheminDe.get(p.video)?.match(/([0-9a-f-]{36})\/(clip_\d+\.mp4)$/i);
      if (!c) continue;
      const cle = cleClip(c[1], c[2]);
      m.set(cle, [...(m.get(cle) ?? []), p]);
    }
    return m;
  }, [liste, etat.videos]);
  /** Pour une publication : le clip d'origine (lot, fichier), s'il vient de « lien → clips ». */
  const clipDe = (p: Publication) => {
    const v = etat.videos.find((x) => x.id === p.video);
    const c = v?.videoChemin?.match(/([0-9a-f-]{36})\/(clip_\d+\.mp4)$/i);
    return { titre: v?.titre || "Ton clip", lot: c?.[1] ?? null, fichier: c?.[2] ?? null };
  };
  return { publications: liste, parClip, clipDe, relire };
}
