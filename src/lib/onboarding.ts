"use client";
/*
 * Réponses de l'onboarding, gardées le temps de la visite (sessionStorage) jusqu'à la création du compte,
 * puis copiées dans le profil. Le plan (objectif relevé, vues nécessaires) se calcule ici.
 */
import { ONBOARDING, OFFRES_PAYANTES, ORDRE_OFFRES, TAUX, type OffrePayante } from "./config";
import type { Profil } from "./etat";

const CLE = "lootclip:onboarding";

/** Ce que la personne fait comme vidéos longues. */
export type Activite = "stream" | "podcast" | "youtube" | "clippeur" | "debut";
/** Où partiront ses clips (même format vertical partout). */
export type Destination = "tiktok" | "shorts" | "reels";
/** Le genre de clips préféré, repris par défaut dans le studio. */
export type StyleClips = "auto" | "drole" | "conseils" | "reactions" | "histoires";

/**
 * `heures` (ancien parcours) et `longues` (vidéos longues par semaine) ne servent qu'à calculer `frequence`.
 * Les champs ajoutés (activite, destinations, styleClips, longues) restent dans le navigateur :
 * le profil en base ne garde que plateforme, objectif, tiktok et frequence.
 */
export type Reponses = Partial<Profil> & { heures?: number; activite?: Activite; destinations?: Destination[]; styleClips?: StyleClips; stylesClips?: StyleClips[]; longues?: number };

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

/** Vidéos longues par semaine : les cases de la roue. Notre repère : trois clips par vidéo longue. */
export const LONGUES = Array.from({ length: 14 }, (_, i) => i + 1);
export const LONGUES_DEFAUT = 3;
/** Clips postés par semaine, au choix sur l'écran du rythme. */
export const CLIPS_SEMAINE = [1, 2, 3, 5, 7, 10, 14, 21] as const;
export const CLIPS_SEMAINE_DEFAUT = 7;
export const CLIPS_PAR_LONGUE = 3;

/** Clips postés par semaine pour un rythme de vidéos longues (trois par jour maximum). */
export const clipsPourLongues = (longues: number) => Math.min(ONBOARDING.videosParSemaineMax, Math.max(1, Math.round(longues * CLIPS_PAR_LONGUE)));

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
  // Le rythme est en clips ; une vidéo en donne environ 4.
  const besoin = Math.ceil(videosParMois(parSemaine) / 4);
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

/* ---------- Préférences gardées pour le studio (genre de clips, réseaux, activité) ---------- */
const CLE_PREFERENCES = "xpclip:preferences";
export type Preferences = { activite?: Activite; destinations?: Destination[]; styleClips?: StyleClips; stylesClips?: StyleClips[] };

export function ecrirePreferences(p: Preferences) {
  try {
    localStorage.setItem(CLE_PREFERENCES, JSON.stringify({ ...lirePreferences(), ...p }));
  } catch {}
}

export function lirePreferences(): Preferences {
  try {
    return JSON.parse(localStorage.getItem(CLE_PREFERENCES) || "{}");
  } catch {
    return {};
  }
}

/* ---------- Lien collé à la fin du parcours, repris par la page Créer ---------- */
const CLE_LIEN = "xpclip:lien";
export const mettreLienEnAttente = (lien: string) => {
  if (!lien.trim()) return; // un lien vide n'écrase jamais celui déjà gardé
  try {
    sessionStorage.setItem(CLE_LIEN, lien.trim());
  } catch {}
};
/** Lit le lien en attente sans l'effacer (pour préremplir le dernier écran du parcours). */
export const lireLienEnAttente = () => {
  try {
    return sessionStorage.getItem(CLE_LIEN) ?? "";
  } catch {
    return "";
  }
};
export const prendreLienEnAttente = () => {
  try {
    const l = sessionStorage.getItem(CLE_LIEN);
    sessionStorage.removeItem(CLE_LIEN);
    return l;
  } catch {
    return null;
  }
};
