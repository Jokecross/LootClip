/*
 * Réglages de XPclip : tout ce qui est chiffré vit ici, au même endroit.
 * Quand le serveur sera branché, les quotas seront revérifiés côté serveur (voir docs/branchement.md).
 */

export const STYLES = {
  defi: { nom: "Défi", detail: "Rythme soutenu, zooms et flashs.", couleur: "var(--color-rose)" },
  mission: { nom: "Mission racontée", detail: "Plans longs, dans l'ordre, façon film.", couleur: "var(--color-orange)" },
  drole: { nom: "Moments drôles", detail: "Coupes très courtes, en rafale.", couleur: "var(--color-turquoise)" },
} as const;

export type Style = keyof typeof STYLES;
const TOUS_LES_STYLES = Object.keys(STYLES) as Style[];

/**
 * Compte sans abonnement : pas d'accès à l'appli, l'écran des offres s'affiche juste après l'onboarding (choix du 23/11/2026).
 * Remettre un essai = changer `videos` ici, la limite dans creer_montage (base) et les textes de la landing.
 */
export const GRATUIT = { nom: "Aucune offre", videos: 0, filigrane: true, styles: TOUS_LES_STYLES };

/** Offres payantes. Prix mensuels TTC en euros. */
export const OFFRES_PAYANTES = {
  starter: {
    nom: "Starter",
    mensuel: 9.99,
    videosParMois: 20,
    styles: ["defi", "drole"] as Style[],
    dureeMaxSec: 60,
    avantages: ["20 vidéos par mois", "Jusqu'à 1 minute", "2 styles de montage", "Sans filigrane"],
  },
  pro: {
    nom: "Pro",
    mensuel: 19.99,
    videosParMois: 60,
    styles: TOUS_LES_STYLES,
    dureeMaxSec: 180,
    avantages: ["60 vidéos par mois", "Jusqu'à 3 minutes", "Les 3 styles de montage", "Sans filigrane"],
  },
  max: {
    nom: "Max",
    mensuel: 49.99,
    videosParMois: 200,
    styles: TOUS_LES_STYLES,
    dureeMaxSec: 180,
    avantages: ["200 vidéos par mois", "Tout ce qu'il y a dans Pro"],
  },
} as const;

export type OffrePayante = keyof typeof OFFRES_PAYANTES;
export type Offre = "gratuit" | OffrePayante;
export type Periodicite = "mensuel" | "annuel";

export const ORDRE_OFFRES: OffrePayante[] = ["starter", "pro", "max"];

/** Pastille de l'offre mise en avant. Pas de « le plus choisi » sans chiffres pour le prouver. */
export const PASTILLE_PRO = "Conseillé";

/** Remise de l'abonnement annuel. */
export const REMISE_ANNUELLE = 0.4;

/**
 * Offre de lancement : -20 % pendant 14 jours, la même fenêtre pour tout le monde.
 * La remise reste acquise tant que l'abonnement est actif (tarif Whop « lancement », voir outils/whop-offres.mjs).
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



const suite = (de: number, a: number, pas: number) => Array.from({ length: Math.round((a - de) / pas) + 1 }, (_, i) => de + i * pas);

/** Onboarding : l'objectif affiché est relevé de 6 % pour viser au-dessus. */
export const ONBOARDING = {
  // Les cases de la roue « objectif » : 50 → 500 → 2 000 → 5 000 → 10 000.
  objectifs: [...suite(50, 500, 50), ...suite(600, 2000, 100), ...suite(2250, 5000, 250), ...suite(5500, 10_000, 500)],
  // Les cases de la roue « heures de jeu par semaine ».
  heures: suite(1, 40, 1),
  heuresParDefaut: 8,
  // Notre repère, à ajuster avec les vrais joueurs : une heure de jeu donne de quoi monter une vidéo.
  videosParHeure: 1,
  // Plafond : 3 vidéos par jour.
  videosParSemaineMax: 21,
  bonusObjectif: 1.06,
  // Valeurs prises si quelqu'un se connecte sans être passé par l'onboarding.
  objectifParDefaut: 500,
  frequenceParDefaut: 7,
};


export const MENTION_OBJECTIF = "Objectif fixé par XPclip, pas une prévision de gains. Aucun revenu n'est garanti.";


/** Adresse publique du site (retour de paiement : Whop exige du https). */
export const SITE = "https://www.xpclip.com";

/** L'éditeur du site, affiché dans les pages légales. `numero` et `responsable` : à compléter avant d'ouvrir le paiement à tous. */
export const SOCIETE = {
  nom: "M&A Labs LLC",
  forme: "société américaine (Limited Liability Company)",
  adresse: "312 West 2nd, Casper, États-Unis",
  numero: "",
  responsable: "",
  contact: "xpclip.contact@gmail.com",
};

export const NON_AFFILIATION = "XPclip n'est pas affilié à Rockstar Games ni à Sony.";

/** « Mot de passe oublié » : à passer à true quand l'envoi d'e-mails (Resend) est branché dans Supabase. */
export const EMAILS_ACTIFS = false;

/** Connexion Google : identifiant client OAuth (public). Vide : le bouton Google n'est pas affiché. */
export const GOOGLE_CLIENT_ID = "56060509244-4c5vom7pe93ib3ankloi8uhbfvjqs703.apps.googleusercontent.com";

export const PURGE_CLIPS_JOURS = 14;

/** Titre écrit par le joueur : affiché en accroche au début de la vidéo, et repris pour TikTok. */
export const TITRE_MAX = 70;

/** Défi affiché sur l'accueil après la première vidéo. */
export const DEFI_JOURS = 7;
