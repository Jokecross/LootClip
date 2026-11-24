"use client";
/*
 * Connexion et inscription avec Google, sans passer par l'adresse de Supabase : le joueur voit « xpclip.com ».
 * 1. allerChezGoogle() envoie chez Google, qui renvoie un jeton d'identité signé à /api/connexion/retour, puis /connexion.
 * 2. finirGoogle() donne ce jeton à Supabase, qui le vérifie et ouvre le compte (créé s'il n'existe pas).
 * Aucun secret : l'identifiant client est public (config.ts), et doit aussi être déclaré dans Supabase.
 */
import { GOOGLE_CLIENT_ID } from "./config";
import { messageErreur, supabase } from "./supabase";

const CLE = "xpclip:google";
type Attente = { etat: string; nonce: string; retour: string; depart: string; le: number };

const auHasard = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (o) => o.toString(16).padStart(2, "0")).join("");
const interne = (chemin: string) => (/^\/(?!\/)/.test(chemin) ? chemin : "/");

/** TikTok, Instagram, Snapchat… : Google refuse de s'ouvrir dans leur navigateur intégré. */
export function navigateurIntegre() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /TikTok|musical_ly|BytedanceWebview|trill_|Instagram|FBAN|FBAV|FB_IAB|Snapchat|Twitter|Line\/|; wv\)/i.test(ua);
}

export async function allerChezGoogle(retour: string) {
  const a: Attente = { etat: auHasard(), nonce: auHasard(), retour: interne(retour), depart: interne(location.pathname + location.search), le: Date.now() };
  localStorage.setItem(CLE, JSON.stringify(a));
  // Google reçoit l'empreinte du nonce, Supabase le nonce : un jeton volé ne peut pas resservir.
  const empreinte = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(a.nonce));
  const nonce = Array.from(new Uint8Array(empreinte), (o) => o.toString(16).padStart(2, "0")).join("");
  const p = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: `${location.origin}/api/connexion/retour`, response_type: "id_token", response_mode: "form_post", scope: "openid email", nonce, state: a.etat, prompt: "select_account" });
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
}

/** Retour de Google : renvoie la page où aller, ou l'erreur à afficher. */
export async function finirGoogle(): Promise<{ vers: string; nouveau: boolean } | { erreur: string; depart: string }> {
  const cookie = document.cookie.split("; ").find((c) => c.startsWith("xpclip_retour="));
  const p = new URLSearchParams(cookie ? decodeURIComponent(cookie.slice("xpclip_retour=".length)) : "");
  document.cookie = "xpclip_retour=; path=/connexion; max-age=0";
  let a: Attente | null = null;
  try {
    a = JSON.parse(localStorage.getItem(CLE) || "null");
    localStorage.removeItem(CLE);
  } catch {}
  const depart = a ? interne(a.depart) : "/inscription";
  if (p.get("error")) return { erreur: p.get("error") === "access_denied" ? "Connexion Google annulée." : "Google n'a pas pu te connecter. Réessaie.", depart };
  const token = p.get("id_token");
  if (!a || !token || p.get("state") !== a.etat || Date.now() - a.le > 15 * 60_000) return { erreur: "La connexion Google a expiré. Réessaie.", depart };
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token, nonce: a.nonce });
  if (error) return { erreur: messageErreur(error), depart };
  return { vers: interne(a.retour), nouveau: Date.now() - new Date(data.user.created_at).getTime() < 60_000 };
}
