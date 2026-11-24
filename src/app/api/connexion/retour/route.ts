/*
 * Retour de Google (voir src/lib/google.ts). Google envoie le jeton dans le corps de la requête, jamais dans l'adresse.
 * Il est posé une minute dans un cookie lisible par la seule page /connexion, qui le donne à Supabase et l'efface.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const vers = (chemin: string) => new NextResponse(null, { status: 303, headers: { location: chemin, "cache-control": "no-store" } });

export async function POST(req: Request) {
  const f = await req.formData().catch(() => null);
  const lire = (k: string, max: number) => String(f?.get(k) ?? "").slice(0, max);
  const p = new URLSearchParams({ state: lire("state", 100), error: lire("error", 60), id_token: lire("id_token", 3000) });
  const rep = vers("/connexion");
  rep.cookies.set("xpclip_retour", p.toString(), { path: "/connexion", maxAge: 60, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  return rep;
}

export const GET = () => vers("/inscription");
