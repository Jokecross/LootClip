"use client";
/*
 * L'état de l'appli côté téléphone : compte, vidéos, factures.
 * La vérité est dans Supabase : src/lib/serveur.ts charge l'état au démarrage, suit les montages
 * en direct, et renvoie vers la base ce que les pages changent avec modifier().
 * Les pages lisent l'état avec useEtat().
 */
import { useSyncExternalStore } from "react";
import { GRATUIT, type Offre, type Periodicite, type Style } from "./config";

export type Plateforme = "ps5" | "xbox";

/** Réponses de l'onboarding, enregistrées dans le profil. */
export type Profil = {
  plateforme: Plateforme;
  objectif: number; // euros par mois, tel que saisi
  tiktok: "abonnes" | "vide" | "non";
  frequence: number; // vidéos par semaine
};

export type Compte = {
  email: string;
  fournisseur: "email" | "google";
  creeLe: string;
  offre: Offre;
  periodicite?: Periodicite;
  abonneDepuis?: string;
  remiseLancement?: boolean;
  abonnementFin?: string; // résilié : fin de l'accès
  tutoVu: boolean;
  plateforme: Plateforme;
  profil?: Profil;
  rappelLe?: string; // rappel « dépose tes clips » prévu le lendemain
  rappelFait?: boolean;
  defiDebut?: string; // début du défi 1 vidéo par jour pendant 7 jours
};

export type Clip = { nom: string; duree: number; taille: number; chemin?: string };

export type Video = {
  id: string;
  creeLe: string; // début du montage
  style: Style;
  clips: Clip[];
  duree: number; // durée de la vidéo montée, en secondes
  accroche: string;
  script: string[];
  titre: string;
  legende: string;
  hashtags: string[];
  filigrane: boolean;
  voixMaj?: string; // dernière régénération de la voix off
  echec?: string; // raison si le montage a échoué
  partageeLe?: string; // envoyée vers TikTok
  notifiee?: boolean;
  // Renseignés par le service de montage
  statut?: "en_attente" | "en_cours" | "termine" | "echoue";
  etape?: number;
  avancement?: number;
  videoChemin?: string;
};

export type Facture = { id: string; le: string; montant: number; libelle: string };

export type Etat = {
  charge: boolean;
  compte: Compte | null;
  videos: Video[];
  progression: { abonnes: number | null; vues: number | null; majLe?: string };
  factures: Facture[];
};

const VIDE: Etat = { charge: false, compte: null, videos: [], progression: { abonnes: null, vues: null }, factures: [] };

let etat: Etat = VIDE;
const abonnes = new Set<() => void>();
let synchro: ((avant: Etat, apres: Etat) => void) | null = null;

const prevenir = () => abonnes.forEach((f) => f());

/** Branché par serveur.ts : reçoit chaque changement fait par une page, pour l'écrire dans la base. */
export function brancherSynchro(f: (avant: Etat, apres: Etat) => void) {
  synchro = f;
}

/** Remplace l'état par ce qui vient du serveur (sans le renvoyer au serveur). */
export function remplacer(f: (e: Etat) => Etat) {
  etat = f(etat);
  prevenir();
}

export function modifier(f: (e: Etat) => Etat) {
  const avant = etat;
  etat = f(etat);
  synchro?.(avant, etat);
  prevenir();
}

/** L'appli est réservée aux abonnés. */
export const aAcces = (e: Etat) => !!e.compte && (e.compte.offre !== "gratuit" || GRATUIT.videos > 0);

export function lireEtat() {
  return etat;
}

export const ETAT_VIDE = VIDE;

function abonner(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export function useEtat(): Etat {
  return useSyncExternalStore(
    abonner,
    () => etat,
    () => VIDE,
  );
}

export const nouvelId = () => Math.random().toString(36).slice(2, 10);
