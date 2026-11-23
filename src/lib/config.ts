/*
 * Réglages de XPclip : tout ce qui est chiffré vit ici, au même endroit.
 * Quand le serveur sera branché, les quotas seront revérifiés côté serveur (voir docs/branchement.md).
 */

export const STYLES = {
  defi: { nom: "Défi", detail: "Une règle folle, tenue jusqu'au bout.", couleur: "var(--color-rose)" },
  mission: { nom: "Mission racontée", detail: "Ta mission racontée comme un film.", couleur: "var(--color-orange)" },
  drole: { nom: "Moments drôles", detail: "Tes bugs et tes ratés, en rafale.", couleur: "var(--color-turquoise)" },
} as const;

export type Style = keyof typeof STYLES;
const TOUS_LES_STYLES = Object.keys(STYLES) as Style[];

/** La version gratuite : 1 vidéo avec filigrane, tous les styles pour bien essayer. */
export const GRATUIT = { nom: "Gratuit", videos: 1, filigrane: true, styles: TOUS_LES_STYLES };

/** Offres payantes. Prix mensuels TTC en euros. */
export const OFFRES_PAYANTES = {
  starter: {
    nom: "Starter",
    mensuel: 9.99,
    videosParMois: 20,
    styles: ["defi", "drole"] as Style[],
    avantages: ["20 vidéos par mois", "Sans filigrane"],
  },
  pro: {
    nom: "Pro",
    mensuel: 19.99,
    videosParMois: 60,
    styles: TOUS_LES_STYLES,
    avantages: ["60 vidéos par mois", "Tous les styles", "Montage prioritaire"],
  },
  max: {
    nom: "Max",
    mensuel: 49.99,
    videosParMois: 200,
    styles: TOUS_LES_STYLES,
    avantages: ["200 vidéos par mois", "Plusieurs pages TikTok", "Tout ce qu'il y a dans Pro"],
  },
} as const;

export type OffrePayante = keyof typeof OFFRES_PAYANTES;
export type Offre = "gratuit" | OffrePayante;
export type Periodicite = "mensuel" | "annuel";

export const ORDRE_OFFRES: OffrePayante[] = ["starter", "pro", "max"];

/** Pastille de la carte Pro sur la page Tarifs. À n'afficher que si c'est vrai (voir le point ouvert). */
export const PASTILLE_PRO = "Le plus choisi";

/** Remise de l'abonnement annuel. */
export const REMISE_ANNUELLE = 0.4;

/**
 * Offre de lancement : -20 % pendant 14 jours, la même fenêtre pour tout le monde.
 * La remise reste acquise tant que l'abonnement est actif (coupon Stripe « forever »).
 */
export const LANCEMENT = { debut: "2026-11-19T00:00:00+01:00", jours: 14, remise: 0.2 };

export const CLIPS = {
  min: 1,
  max: 10,
  dureeMaxSec: 180,
  // Assez de jeu pour sortir au moins une vidéo courte.
  dureeTotaleMinSec: 15,
};

export const VIDEO = {
  largeur: 1080,
  hauteur: 1920,
  accrocheSec: 3,
  // Part maximale des clips gardée au montage : on ne garde que le meilleur.
  partUtile: 0.85,
};

/** Durées proposées au joueur. « Longue » prend tout le meilleur, jusqu'à 3 minutes. */
export const DUREES = {
  courte: { nom: "Courte", cible: 30 },
  moyenne: { nom: "Moyenne", cible: 60 },
  longue: { nom: "Longue", cible: 180 },
} as const;

export type Duree = keyof typeof DUREES;

// Montants constatés du programme de récompenses TikTok, en dollars pour 1 000 vues qualifiées.
export const TAUX = { bas: 0.4, haut: 1.0 };



/** Onboarding : l'objectif affiché est relevé de 6 % pour viser au-dessus. */
export const ONBOARDING = {
  objectifs: [100, 500, 1000, 5000],
  objectifMin: 10,
  objectifMax: 100_000,
  frequences: [3, 7, 14],
  bonusObjectif: 1.06,
  // Valeurs prises si quelqu'un se connecte sans être passé par l'onboarding.
  objectifParDefaut: 500,
  frequenceParDefaut: 7,
};


export const MENTION_OBJECTIF = "Objectif fixé par XPclip, pas une prévision de gains. Aucun revenu n'est garanti.";


export const NON_AFFILIATION = "XPclip n'est pas affilié à Rockstar Games ni à Sony.";

export const PURGE_CLIPS_JOURS = 14;

/** Titre écrit par le joueur : affiché en accroche au début de la vidéo, et repris pour TikTok. */
export const TITRE_MAX = 70;

/** Défi affiché sur l'accueil après la première vidéo. */
export const DEFI_JOURS = 7;
