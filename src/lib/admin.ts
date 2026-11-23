/*
 * Accès complet à la base, réservé au serveur (routes /api).
 * La clé SUPABASE_SERVICE_ROLE_KEY est une variable Vercel « Sensitive », SANS NEXT_PUBLIC_.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const adminConfigure = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function admin() {
  if (!adminConfigure()) throw new Error("SUPABASE_SERVICE_ROLE_KEY manque côté serveur");
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** L'utilisateur connecté, d'après l'en-tête « Authorization: Bearer … » de la requête. */
export async function utilisateurDe(req: Request) {
  const jeton = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!jeton) return null;
  const { data } = await admin().auth.getUser(jeton);
  return data.user ?? null;
}
