"use client";
/*
 * Réponses de l'onboarding, gardées le temps de la visite (sessionStorage) jusqu'à la création du compte,
 * puis copiées dans le profil. Le plan (objectif relevé, vues nécessaires) se calcule ici.
 */
import { ONBOARDING, OFFRES_PAYANTES, ORDRE_OFFRES, TAUX, type OffrePayante } from "./config";
import type { Profil } from "./etat";

const CLE = "lootclip:onboarding";

/** `heures` (jeu par semaine) ne sert qu'à calculer `frequence`. */
export type Reponses = Partial<Profil> & { heures?: number };

export function lireReponses(): Reponses {
  try {
    return JSON.parse(sessionStorage.getItem(CLE) || "{}");
  } catch {
    return {};
  }
}

export function ecrireReponses(r: Reponses) {
  try {
    sessionStorage.setItem(CLE, JSON.stringify({ ...lireReponses(), ...r }));
  } catch {}
}

export const effacerReponses = () => {
  try {
    sessionStorage.removeItem(CLE);
  } catch {}
};

export const objectifBooste = (objectif: number) => Math.round(objectif * ONBOARDING.bonusObjectif);

/** Nombre de vidéos par semaine que ses heures de jeu permettent. */
export const videosPourHeures = (heures: number) => Math.min(ONBOARDING.videosParSemaineMax, Math.max(1, Math.round(heures * ONBOARDING.videosParHeure)));

/** Nombre de vidéos par mois pour un rythme hebdomadaire. */
export const videosParMois = (parSemaine: number) => Math.round((parSemaine * 52) / 12);

/** Plan calculé à partir des réponses. Les vues sont des vues qualifiées par mois. */
export function plan(objectif: number, parSemaine: number) {
  const booste = objectifBooste(objectif);
  const vuesMin = (booste / TAUX.haut) * 1000;
  const vuesMax = (booste / TAUX.bas) * 1000;
  const parMoisExact = (parSemaine * 52) / 12;
  return {
    booste,
    vuesMin,
    vuesMax,
    parMois: videosParMois(parSemaine),
    vuesParVideoMin: vuesMin / parMoisExact,
    vuesParVideoMax: vuesMax / parMoisExact,
  };
}

/** L'offre dont le quota couvre le rythme de publication (sinon la plus grande). */
export function offreConseillee(parSemaine: number): OffrePayante {
  const besoin = videosParMois(parSemaine);
  return ORDRE_OFFRES.find((o) => OFFRES_PAYANTES[o].videosParMois >= besoin) ?? "max";
}

/* ---------- Fichiers choisis dans la galerie avant d'arriver sur Créer ---------- */
let fichiersEnAttente: File[] = [];
export const mettreEnAttente = (f: FileList | File[]) => {
  fichiersEnAttente = Array.from(f);
};
export const prendreEnAttente = () => {
  const f = fichiersEnAttente;
  fichiersEnAttente = [];
  return f;
};
