"use client";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client Supabase du navigateur. La clé « anon » est publique : la sécurité vient des règles RLS de la base. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Traduit les erreurs de la base et de l'authentification en phrases courtes. */
export function messageErreur(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (m.includes("quota_atteint")) return "quota_atteint";
  if (m.includes("style_ferme")) return "Ce style est inclus dans Pro et Max.";
  if (m.includes("duree_fermee")) return "Les vidéos longues sont incluses dans Pro et Max.";
  if (m.includes("nombre_de_clips")) return "Il faut entre 1 et 10 clips.";
  if (m.includes("duree_invalide")) return "Durée de vidéo impossible.";
  if (m.includes("clip_invalide")) return "Un clip n'a pas été envoyé correctement. Réessaie.";
  if (m.includes("non_connecte")) return "Ta session a expiré. Reconnecte-toi.";
  if (/already registered|already been registered|user_already_exists/i.test(m)) return "Ce compte existe déjà. Connecte-toi.";
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/password should be at least|weak/i.test(m)) return "Mot de passe trop court ou trop simple.";
  if (/email not confirmed/i.test(m)) return "Ton compte n'est pas encore activé.";
  if (/signups not allowed|signup is disabled/i.test(m)) return "Les inscriptions sont fermées pour le moment.";
  if (/rate limit|only request this after/i.test(m)) return "Trop de tentatives. Attends une minute et réessaie.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Connexion impossible. Vérifie ton réseau.";
  return "Une erreur est survenue. Réessaie.";
}
