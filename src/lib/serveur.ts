"use client";
/*
 * Le lien entre l'appli et Supabase.
 * - Au démarrage et à chaque connexion : charge le profil, les montages et les factures.
 * - Suit les montages en direct (Realtime) : l'avancement écrit par le service de montage arrive tout seul.
 * - Renvoie vers la base ce que les pages changent (console, tutoriel vu, partage, rappel…).
 * L'abonnement n'est jamais écrit d'ici : la base le refuse, seul le serveur, d'après Whop, peut le changer.
 */
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import type { Style } from "./config";
import { brancherSynchro, ETAT_VIDE, lireEtat, remplacer, type Compte, type Etat, type Video } from "./etat";
import { effacerReponses, lireReponses } from "./onboarding";
import { supabase } from "./supabase";

type LigneProfil = {
  id: string;
  email: string | null;
  plateforme: "ps5" | "xbox";
  objectif: number | null;
  tiktok: "abonnes" | "vide" | "non" | null;
  frequence: number | null;
  tuto_vu: boolean;
  defi_debut: string | null;
  rappel_le: string | null;
  rappel_fait: boolean;
  offre: Compte["offre"];
  periodicite: "mensuel" | "annuel" | null;
  abonne_depuis: string | null;
  remise_lancement: boolean;
  abonnement_fin?: string | null;
  cree_le: string;
};

type LigneMontage = {
  id: string;
  style: Style;
  statut: "en_attente" | "en_cours" | "termine" | "echoue";
  etape: number;
  avancement: number;
  clips: Video["clips"];
  duree: number | null;
  accroche: string | null;
  titre: string | null;
  legende: string | null;
  hashtags: string[] | null;
  filigrane: boolean;
  video_chemin: string | null;
  erreur: string | null;
  partagee_le: string | null;
  cree_le: string;
};

const CLE_NOTIFIEES = "lootclip:notifiees";
const notifiees = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLE_NOTIFIEES) || "[]"));
  } catch {
    return new Set();
  }
};

function versCompte(p: LigneProfil, user: User): Compte {
  return {
    email: user.email ?? p.email ?? "",
    fournisseur: user.app_metadata?.provider === "google" ? "google" : "email",
    creeLe: p.cree_le,
    offre: p.offre,
    periodicite: p.periodicite ?? undefined,
    abonneDepuis: p.abonne_depuis ?? undefined,
    remiseLancement: p.remise_lancement,
    abonnementFin: p.abonnement_fin ?? undefined,
    tutoVu: p.tuto_vu,
    plateforme: p.plateforme,
    profil: p.objectif && p.frequence && p.tiktok ? { plateforme: p.plateforme, objectif: p.objectif, tiktok: p.tiktok, frequence: p.frequence } : undefined,
    rappelLe: p.rappel_le ?? undefined,
    rappelFait: p.rappel_fait,
    defiDebut: p.defi_debut ?? undefined,
  };
}

function versVideo(m: LigneMontage, dejaNotifiees: Set<string>): Video {
  return {
    id: m.id,
    creeLe: m.cree_le,
    style: m.style,
    clips: m.clips ?? [],
    duree: m.duree ?? 75,
    accroche: m.accroche ?? "",
    script: [],
    titre: m.titre ?? "",
    legende: m.legende ?? "",
    hashtags: m.hashtags ?? [],
    filigrane: m.filigrane,
    echec: m.statut === "echoue" ? m.erreur || "Le montage n'a pas pu aboutir." : undefined,
    partageeLe: m.partagee_le ?? undefined,
    notifiee: dejaNotifiees.has(m.id),
    statut: m.statut,
    etape: m.etape,
    avancement: m.avancement,
    videoChemin: m.video_chemin ?? undefined,
  };
}

/* ---------- Chargement ---------- */

let canal: RealtimeChannel | null = null;
let enCours: Promise<void> | null = null;
let utilisateur: User | null = null;
let generation = 0; // seul le dernier chargement lancé a le droit d'écrire

export const utilisateurActuel = () => utilisateur;

async function lireProfil(id: string) {
  for (let essai = 0; essai < 3; essai++) {
    const { data } = await supabase.from("profils").select("*").eq("id", id).maybeSingle();
    if (data) return data as LigneProfil;
    // Le profil est créé par un déclencheur juste après l'inscription : on lui laisse un instant.
    await new Promise((ok) => setTimeout(ok, 400));
  }
  return null;
}

async function charger(user: User | null) {
  const g = ++generation;
  utilisateur = user;
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
  if (!user) {
    remplacer(() => ({ ...ETAT_VIDE, charge: true }));
    return;
  }

  let profil = await lireProfil(user.id);

  // Réponses de l'onboarding gardées pendant l'inscription (e-mail ou Google) : on les range dans le profil.
  const rep = lireReponses();
  if (profil && !profil.objectif && rep.objectif && rep.frequence && rep.tiktok) {
    const { data } = await supabase
      .from("profils")
      .update({ plateforme: rep.plateforme ?? "ps5", objectif: rep.objectif, tiktok: rep.tiktok, frequence: rep.frequence })
      .eq("id", user.id)
      .select()
      .maybeSingle();
    if (data) {
      profil = data as LigneProfil;
      effacerReponses();
    }
  }

  const [{ data: montages }, { data: factures }] = await Promise.all([
    supabase.from("montages").select("*").order("cree_le", { ascending: false }),
    supabase.from("factures").select("*").order("le", { ascending: false }),
  ]);
  const vues = notifiees();
  if (g !== generation) return; // un chargement plus récent a pris le relais

  remplacer(() => ({
    charge: true,
    compte: profil ? versCompte(profil, user) : null,
    videos: ((montages ?? []) as LigneMontage[]).map((m) => versVideo(m, vues)),
    progression: { abonnes: null, vues: null },
    factures: (factures ?? []).map((f) => ({ id: f.id, le: f.le, montant: Number(f.montant), libelle: f.libelle })),
  }));

  // Avancement des montages en direct
  canal = supabase
    .channel(`montages-${user.id}-${g}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "montages", filter: `user_id=eq.${user.id}` }, (charge) => {
      if (charge.eventType === "DELETE") {
        const id = (charge.old as { id: string }).id;
        remplacer((e) => ({ ...e, videos: e.videos.filter((v) => v.id !== id) }));
        return;
      }
      const ligne = charge.new as LigneMontage;
      remplacer((e) => {
        const existante = e.videos.find((v) => v.id === ligne.id);
        const video = { ...versVideo(ligne, notifiees()), notifiee: existante?.notifiee ?? false };
        return existante ? { ...e, videos: e.videos.map((v) => (v.id === ligne.id ? { ...v, ...video } : v)) } : { ...e, videos: [video, ...e.videos] };
      });
    })
    .subscribe();
}

/** Recharge tout maintenant (après une connexion, avant de changer d'écran). */
export function rafraichir() {
  enCours = (async () => {
    const { data } = await supabase.auth.getUser();
    await charger(data.user ?? null);
  })();
  return enCours;
}

/* ---------- Écriture des changements faits par les pages ---------- */

function pousser(avant: Etat, apres: Etat) {
  const user = utilisateur;
  if (!user) return;

  // Vidéos notifiées : gardées sur le téléphone seulement
  const nouvellesNotifiees = apres.videos.filter((v) => v.notifiee && !avant.videos.find((a) => a.id === v.id)?.notifiee);
  if (nouvellesNotifiees.length) {
    const s = notifiees();
    nouvellesNotifiees.forEach((v) => s.add(v.id));
    try {
      localStorage.setItem(CLE_NOTIFIEES, JSON.stringify([...s].slice(-300)));
    } catch {}
  }

  // Partage vers TikTok
  apres.videos
    .filter((v) => v.partageeLe && !avant.videos.find((a) => a.id === v.id)?.partageeLe)
    .forEach((v) => supabase.rpc("marquer_partagee", { p_id: v.id }).then(() => {}));

  // Profil (jamais l'abonnement)
  const a = avant.compte;
  const b = apres.compte;
  if (!a || !b) return;
  const maj: Record<string, unknown> = {};
  if (a.plateforme !== b.plateforme) maj.plateforme = b.plateforme;
  if (a.tutoVu !== b.tutoVu) maj.tuto_vu = b.tutoVu;
  if (a.defiDebut !== b.defiDebut) maj.defi_debut = b.defiDebut ?? null;
  if (a.rappelLe !== b.rappelLe) maj.rappel_le = b.rappelLe ?? null;
  if (a.rappelFait !== b.rappelFait) maj.rappel_fait = !!b.rappelFait;
  if (JSON.stringify(a.profil) !== JSON.stringify(b.profil) && b.profil) {
    Object.assign(maj, { objectif: b.profil.objectif, tiktok: b.profil.tiktok, frequence: b.profil.frequence });
  }
  if (Object.keys(maj).length) supabase.from("profils").update(maj).eq("id", user.id).then(() => {});
}

/* ---------- Démarrage ---------- */

let demarre = false;

export function initialiserSession() {
  if (demarre) return;
  demarre = true;
  brancherSynchro(pousser);
  supabase.auth.onAuthStateChange((evenement, session) => {
    if (evenement === "TOKEN_REFRESHED") {
      utilisateur = session?.user ?? null;
      return;
    }
    if (evenement === "INITIAL_SESSION" || evenement === "SIGNED_IN" || evenement === "SIGNED_OUT") {
      // Supabase déconseille d'attendre une requête dans ce rappel : on la lance juste après.
      setTimeout(() => {
        if (evenement === "SIGNED_IN" && utilisateur?.id === session?.user.id && lireEtat().charge) return;
        enCours = charger(session?.user ?? null);
      }, 0);
    }
  });
}

/* ---------- Actions de compte ---------- */

/** « local » : le compte n'existe plus côté serveur, on ferme seulement la session du téléphone. */
export async function deconnecter(seulementIci = false) {
  await supabase.auth.signOut(seulementIci ? { scope: "local" } : undefined);
}

/** Efface les fichiers du joueur, puis son compte et toutes ses données (cascade dans la base). Appeler deconnecter() ensuite. */
export async function supprimerCompte() {
  const user = utilisateur;
  if (!user) return;
  // Comptes TikTok et Instagram d'abord : plus rien ne doit partir après la suppression.
  const { data: s } = await supabase.auth.getSession();
  const r = await fetch("/api/publication/oublier", { method: "POST", headers: { authorization: `Bearer ${s.session?.access_token ?? ""}` } });
  if (!r.ok) throw new Error("comptes reliés");
  for (const bucket of ["clips", "videos"]) {
    const { data } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
    if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${user.id}/${f.name}`));
  }
  const { error } = await supabase.rpc("supprimer_mon_compte");
  if (error) throw error;
}
