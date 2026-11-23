"use client";
/*
 * Montages : créés dans Supabase par la fonction creer_montage (qui vérifie le quota),
 * puis lancés par /api/montage dans une machine Vercel (src/lib/atelier.ts) qui donne son avancement.
 * NEXT_PUBLIC_MONTAGE_SIMULE=1 fait avancer les états avec le temps, sans rien monter (démo).
 */
import { useEffect, useState } from "react";
import { CLIPS, DUREES, GRATUIT, OFFRES_PAYANTES, VIDEO, type Duree, type Offre, type Style } from "./config";
import { lireEtat, remplacer, type Clip, type Etat, type Video } from "./etat";
import { messageErreur, supabase } from "./supabase";
import { suivre } from "./suivi";

export type Statut = "en_attente" | "en_cours" | "termine" | "echoue";

export const ETAPES = [
  "Sélection des meilleurs passages",
  "Assemblage en 9:16",
  "Accroche",
  "Export en 1080 × 1920",
];

const ATTENTE_MS = 3000;
const ETAPE_MS = 4000;

const SIMULE = process.env.NEXT_PUBLIC_MONTAGE_SIMULE === "1";

export function statutDe(v: Video, maintenant: number): { statut: Statut; etape: number; avancement: number } {
  if (v.echec) return { statut: "echoue", etape: 0, avancement: 0 };
  if (!SIMULE && v.statut) {
    if (v.statut === "termine") return { statut: "termine", etape: ETAPES.length, avancement: 1 };
    return { statut: v.statut, etape: Math.min(ETAPES.length - 1, v.etape ?? 0), avancement: v.avancement ?? 0 };
  }
  const ecoule = maintenant - new Date(v.creeLe).getTime();
  if (ecoule < ATTENTE_MS) return { statut: "en_attente", etape: 0, avancement: 0 };
  const enCours = ecoule - ATTENTE_MS;
  const total = ETAPES.length * ETAPE_MS;
  if (enCours >= total) return { statut: "termine", etape: ETAPES.length, avancement: 1 };
  return { statut: "en_cours", etape: Math.floor(enCours / ETAPE_MS), avancement: enCours / total };
}

export const LIBELLES_STATUT: Record<Statut, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  termine: "Terminé",
  echoue: "Échoué",
};

/** Horloge partagée pour faire avancer les états à l'écran. */
export function useMaintenant(intervalle = 500) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), intervalle);
    return () => clearInterval(id);
  }, [intervalle]);
  return t;
}

/* ---------- Quota : vérifié ici pour l'affichage, et côté serveur une fois branché ---------- */

export function quota(etat: Etat) {
  const compte = etat.compte;
  const valides = etat.videos.filter((v) => !v.echec);
  if (!compte || compte.offre === "gratuit") {
    const total = GRATUIT.videos;
    return { utilise: valides.length, total, restant: Math.max(0, total - valides.length), periode: "en tout" };
  }
  const d = new Date();
  const ceMois = valides.filter((v) => {
    const c = new Date(v.creeLe);
    return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
  });
  const total = OFFRES_PAYANTES[compte.offre].videosParMois;
  return { utilise: ceMois.length, total, restant: Math.max(0, total - ceMois.length), periode: "ce mois-ci" };
}

/** Styles ouverts par l'offre du compte. */
export const stylesOuverts = (offre: Offre): readonly Style[] => (offre === "gratuit" ? GRATUIT.styles : OFFRES_PAYANTES[offre].styles);

/* ---------- Textes générés : accroche, titre, légende, hashtags ---------- */

const TEXTES: Record<Style, { accroches: string[]; script: string[]; titres: string[]; tags: string[] }> = {
  defi: {
    accroches: ["Une seule règle : ne jamais freiner.", "J'ai tenté le défi le plus bête de GTA 6.", "Traverser toute la ville sans une égratignure."],
    script: [
      "La règle est simple.",
      "Je traverse la ville sans toucher au frein.",
      "Premier virage. Ça passe de justesse.",
      "Là, j'ai vraiment cru que c'était fini.",
      "Plus que deux rues avant l'arrivée.",
      "Dis-moi en commentaire quel défi je tente ensuite.",
    ],
    titres: ["Défi : zéro frein dans GTA 6", "Je tiens ce défi jusqu'au bout ?", "Le défi le plus bête de GTA 6"],
    tags: ["#defi", "#challenge"],
  },
  mission: {
    accroches: ["Le plan était parfait. Presque.", "Cette mission a mal tourné en dix secondes.", "Personne ne m'avait prévenu pour la fin."],
    script: [
      "Le plan était parfait.",
      "Entrer, prendre la voiture, ressortir.",
      "Sauf que rien ne s'est passé comme prévu.",
      "Trois voitures derrière moi. Aucune sortie.",
      "Alors j'ai pris le chemin le plus fou.",
      "Abonne-toi pour la suite de la mission.",
    ],
    titres: ["Ma mission a mal tourné", "Le plan parfait. Ou presque.", "Cette fin de mission, sérieux"],
    tags: ["#storytime", "#mission"],
  },
  drole: {
    accroches: ["Regarde bien la voiture à droite.", "Je n'étais pas prêt pour ça.", "Le bug le plus drôle de ma session."],
    script: [
      "Regarde bien la voiture à droite.",
      "Non, ce n'est pas normal.",
      "Deuxième essai. Encore pire.",
      "Là, j'ai lâché la manette de rire.",
      "Le meilleur est à la fin.",
      "Envoie ça à ton pote qui joue avec toi.",
    ],
    titres: ["Mes pires ratés sur GTA 6", "Ce bug m'a achevé", "GTA 6, mais tout part en vrille"],
    tags: ["#drole", "#fails"],
  },
};

const hasard = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

/** Textes de la vidéo. Si le joueur a écrit son titre, il sert d'accroche et de titre TikTok. */
export function genererTextes(style: Style, titrePerso?: string) {
  const t = TEXTES[style];
  const perso = titrePerso?.trim().replace(/\s+/g, " ");
  const accroche = perso || hasard(t.accroches);
  const titre = perso || hasard(t.titres);
  return {
    accroche,
    script: [accroche, ...t.script.slice(1)],
    titre,
    legende: `${titre}${/[.!?…]$/.test(titre) ? "" : "."} Clip original, monté par moi.`,
    hashtags: ["#gta6", "#gta6clips", ...t.tags, "#ps5", "#gaming", "#fyp"],
  };
}

/* ---------- Lancement sur le serveur ---------- */

/** Demande au serveur de démarrer le montage. Sans danger si on le demande plusieurs fois. */
export async function demanderMontage(id: string) {
  if (SIMULE) return;
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) return;
  await fetch("/api/montage", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${jeton}` },
    body: JSON.stringify({ id }),
    keepalive: true, // part même si le joueur ferme la page juste après
  }).catch(() => {});
}

/** Après un achat : remet la vidéo gratuite en file, sans filigrane. */
export async function retirerFiligrane(id: string) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/montage/sans-filigrane", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ id }),
  });
  if (!r.ok) throw new Error("refus");
  remplacer((e) => ({ ...e, videos: e.videos.map((v) => (v.id === id ? { ...v, filigrane: false, statut: "en_attente" as const, etape: 0, avancement: 0, notifiee: false } : v)) }));
  demanderMontage(id);
}

const RELANCE_MS = 20_000;
const SILENCE_MS = 27 * 60_000;

/** Tant que l'appli est ouverte : relance un montage resté en attente, signale un montage sans nouvelles. */
export function surveillerMontages() {
  if (SIMULE) return () => {};
  const verifier = () => {
    const t = Date.now();
    for (const v of lireEtat().videos) {
      const age = t - new Date(v.creeLe).getTime();
      if ((v.statut === "en_attente" && age > 10_000) || (v.statut === "en_cours" && age > SILENCE_MS)) demanderMontage(v.id);
    }
  };
  const depart = setTimeout(verifier, 4000);
  const id = setInterval(verifier, RELANCE_MS);
  return () => {
    clearTimeout(depart);
    clearInterval(id);
  };
}

/* ---------- Création d'un montage ---------- */

/** Les fichiers déposés restent lisibles pendant la session : sert à l'aperçu dans le lecteur. */
const sourcesSession = new Map<string, string[]>();
export const sourcesDe = (id: string) => sourcesSession.get(id) ?? null;

/**
 * Crée le montage dans la base. La fonction creer_montage revérifie le quota, le style et les clips :
 * en cas de refus, on lève une erreur lisible (« quota_atteint » pour ouvrir l'écran des offres).
 */
export async function lancerMontage({
  style,
  clips,
  urls,
  source,
  titre,
  duree: choix,
}: {
  style: Style;
  clips: Clip[];
  urls: string[];
  source?: string;
  titre?: string;
  duree: number;
}) {
  const duree = Math.round(choix);
  const textes = genererTextes(style, titre);
  const { data: id, error } = await supabase.rpc("creer_montage", {
    p_style: style,
    p_clips: clips.map((c) => ({ chemin: c.chemin, nom: c.nom, duree: Math.round(c.duree), taille: c.taille })),
    p_duree: duree,
    p_accroche: textes.accroche,
    p_titre: textes.titre,
    p_legende: textes.legende,
    p_hashtags: textes.hashtags,
    p_source: source ?? null,
  });
  if (error || !id) throw new Error(messageErreur(error));

  demanderMontage(id as string);

  if (urls.length) sourcesSession.set(id as string, urls);
  const premiere = lireEtat().videos.length === 0;
  const video: Video = {
    id: id as string,
    creeLe: new Date().toISOString(),
    style,
    clips,
    duree,
    filigrane: lireEtat().compte?.offre === "gratuit",
    statut: "en_attente",
    etape: 0,
    avancement: 0,
    ...textes,
  };
  // Le temps réel l'ajoutera aussi : on évite le doublon.
  remplacer((e) => (e.videos.some((v) => v.id === video.id) ? e : { ...e, videos: [video, ...e.videos] }));
  if (premiere) suivre("premiere_video", { style });
  return id as string;
}

/** « Refaire avec un autre style » : mêmes clips (déjà dans le stockage), nouveau montage. */
export function refaire(source: Video, style: Style) {
  const urls = sourcesSession.get(source.id) ?? [];
  // Un titre écrit par le joueur se reconnaît : il sert à la fois d'accroche et de titre. On le garde.
  const titre = source.accroche && source.accroche === source.titre ? source.titre : undefined;
  return lancerMontage({ style, clips: source.clips, urls, source: source.id, titre, duree: source.duree });
}

export function verifierClips(clips: Clip[]): string | null {
  if (clips.length < CLIPS.min) return "Ajoute au moins un clip.";
  if (clips.length > CLIPS.max) return `${CLIPS.max} clips maximum par vidéo.`;
  const total = clips.reduce((s, c) => s + c.duree, 0);
  if (total < CLIPS.dureeTotaleMinSec) return `Il faut au moins ${CLIPS.dureeTotaleMinSec} secondes de jeu.`;
  return null;
}

/**
 * Durées possibles avec les clips déposés. On ne garde jamais plus de 85 % du jeu (le meilleur),
 * donc une durée est grisée quand il n'y a pas assez de matière.
 */
export function optionsDuree(totalClips: number): { cle: Duree; nom: string; secondes: number; dispo: boolean }[] {
  const utile = Math.floor(totalClips * VIDEO.partUtile);
  return (Object.keys(DUREES) as Duree[]).map((cle) => {
    const { nom, cible } = DUREES[cle];
    if (cle === "longue") return { cle, nom, secondes: Math.min(cible, utile), dispo: utile >= 75 };
    if (cle === "courte") return { cle, nom, secondes: Math.min(cible, utile), dispo: utile >= 10 };
    return { cle, nom, secondes: cible, dispo: utile >= cible };
  });
}

/** Durée proposée par défaut : la moyenne si possible, sinon la plus longue possible. */
export function dureeParDefaut(totalClips: number): Duree {
  const o = optionsDuree(totalClips).filter((x) => x.dispo);
  return o.find((x) => x.cle === "moyenne")?.cle ?? o.at(-1)?.cle ?? "courte";
}
