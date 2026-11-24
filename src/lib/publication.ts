"use client";
/* Publication sur TikTok et Instagram, côté joueur. Tout passe par /api/publication : aucune clé ici. */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type Reseau = "tiktok" | "instagram";
export type CompteSocial = { id: string; reseau: Reseau; pseudo: string | null; photo: string | null; actif: boolean };
export type Publication = { id: string; video: string; reseau: Reseau; pseudo: string | null; statut: "envoi" | "programmee" | "en_cours" | "publiee" | "echouee" | "annulee"; prevuLe: string | null; lien: string | null; erreur: string | null; creeLe: string };
export type OptionsTiktok = { visibilite: "public" | "friends" | "private" | null; commentaires: boolean; duos: boolean; collages: boolean; maMarque: boolean; partenaire: boolean };

const MESSAGES: Record<string, string> = {
  non_connecte: "Ta session a expiré. Reconnecte-toi.",
  ferme: "La publication ouvre très bientôt.",
  offre_requise: "Il te faut une offre pour publier.",
  deja_relie: "Ce réseau est déjà relié.",
  en_cours: "Une vidéo est en train de partir. Attends un instant.",
  heure: "Choisis une heure à venir.",
  options: "Choisis qui peut voir ta vidéo sur TikTok.",
  compte: "Relie d'abord ton compte.",
  deja: "Cette vidéo est déjà partie sur ce réseau.",
  partie: "Trop tard, elle est déjà partie.",
  filigrane: "Refais d'abord ta vidéo sans filigrane.",
  trop: "Beaucoup de publications d'un coup. Réessaie dans une heure.",
  occupe: "Beaucoup de monde. Réessaie dans une minute.",
};

async function appeler<T>(methode: string, chemin = "", corps?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(`/api/publication${chemin}`, {
    method: methode,
    headers: { authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(corps === undefined ? {} : { "content-type": "application/json" }) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  }).catch(() => null);
  const j = await r?.json().catch(() => ({}));
  if (!r?.ok) throw Object.assign(new Error(MESSAGES[j?.erreur] ?? "Impossible pour l'instant. Réessaie."), { code: j?.erreur as string | undefined });
  return j as T;
}

/* ---------- Comptes ---------- */

export const lireComptes = () => appeler<{ comptes: CompteSocial[] }>("GET", "/comptes").then((j) => j.comptes);
export const delier = (id: string) => appeler("DELETE", "/comptes", { id });
export const confirmerComptes = (ids: string[]) => appeler("PUT", "/comptes", { ids });

const CLE_RETOUR = "xpclip:retour-comptes";

/** Part sur la page officielle TikTok ou Instagram, et retient où revenir ensuite. */
export async function relier(reseau: Reseau, retour?: string) {
  const { url } = await appeler<{ url: string }>("POST", "/comptes", { reseau });
  try {
    localStorage.setItem(CLE_RETOUR, JSON.stringify({ retour: retour ?? null, le: Date.now() }));
  } catch {}
  window.location.href = url;
}

/** Où revenir après la connexion d'un compte (valable une heure, lu une seule fois). */
export function lireRetour(): string | null {
  try {
    const r = JSON.parse(localStorage.getItem(CLE_RETOUR) || "null");
    localStorage.removeItem(CLE_RETOUR);
    return r && Date.now() - r.le < 3_600_000 && typeof r.retour === "string" && /^\/(app\/|commencer\?)/.test(r.retour) ? r.retour : null;
  } catch {
    return null;
  }
}

export function messageConnexion(reseau: Reseau, brut: string) {
  if (/external.?id/i.test(brut)) return "Ce compte est déjà relié à un autre compte XPclip.";
  if (reseau === "instagram" && /business|professional|creator|account type/i.test(brut)) return "Passe ton Instagram en compte professionnel, puis réessaie.";
  return "La connexion n'a pas abouti. Réessaie.";
}

/** null : pas encore su. Sert aussi à savoir si la publication est ouverte pour ce compte. */
export function useComptes() {
  const [comptes, setComptes] = useState<CompteSocial[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const relire = useCallback(() => {
    lireComptes()
      .then((c) => (setErreur(null), setComptes(c)))
      .catch((e: Error) => setErreur(e.message));
  }, []);
  useEffect(relire, [relire]);
  return { comptes, erreur, relire };
}

let ouverte: boolean | null = null;

export function usePublicationOuverte() {
  const [v, setV] = useState(ouverte === true);
  useEffect(() => {
    if (ouverte !== null) return setV(ouverte);
    lireComptes()
      .then(() => setV((ouverte = true)))
      .catch((e: { code?: string }) => {
        if (e.code === "ferme") ouverte = false;
      });
  }, []);
  return v;
}

/* ---------- Publications ---------- */

export const publier = (c: { video: string; reseau: Reseau; texte: string; quand: string | null; options?: OptionsTiktok }) => appeler<{ publication: Publication }>("POST", "", c).then((j) => j.publication);
export const changerHeure = (id: string, quand: string) => appeler("PATCH", "", { id, quand });
export const annulerPublication = (id: string) => appeler("DELETE", "", { id });

export const active = (p: Publication) => ["envoi", "programmee", "en_cours", "publiee"].includes(p.statut);
const partante = (p: Publication) => ["envoi", "en_cours"].includes(p.statut) || (p.statut === "programmee" && !!p.prevuLe && Date.parse(p.prevuLe) <= Date.now());

/** Les publications, relues toutes les 15 secondes tant que l'une d'elles est en train de partir. */
export function usePublications(video?: string) {
  const [liste, setListe] = useState<Publication[] | null>(null);
  const vivant = useRef(true);
  const relire = useCallback(
    () =>
      appeler<{ publications: Publication[] }>("GET", video ? `?video=${video}` : "")
        .then((j) => vivant.current && setListe(j.publications))
        .catch(() => {}),
    [video],
  );
  useEffect(() => {
    vivant.current = true;
    relire();
    return () => {
      vivant.current = false;
    };
  }, [relire]);
  useEffect(() => {
    if (!liste?.some((p) => partante(p) || p.statut === "programmee")) return;
    const id = setInterval(() => !document.hidden && liste.some(partante) && relire(), 15_000);
    return () => clearInterval(id);
  }, [liste, relire]);
  return { liste, relire };
}

export function quandLisible(iso: string) {
  const d = new Date(iso);
  const jour = (x: Date) => x.toDateString();
  const demain = new Date(Date.now() + 86_400_000);
  const nom = jour(d) === jour(new Date()) ? "aujourd'hui" : jour(d) === jour(demain) ? "demain" : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  return `${nom} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
}
