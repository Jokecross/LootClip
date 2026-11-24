/* Le studio de tournage est réservé aux comptes de l'équipe (WHOP_TESTEURS). */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { estTesteur } from "@/lib/whop";

export async function GET(req: Request) {
  // STUDIO_LOCAL : version rapide lancée sur le Mac, jamais posé sur Vercel.
  if (process.env.NODE_ENV !== "production" || process.env.STUDIO_LOCAL === "1") return Response.json({ ok: true });
  if (!adminConfigure()) return Response.json({ ok: false }, { status: 503 });
  const user = await utilisateurDe(req);
  const ok = estTesteur(user?.email);
  return Response.json({ ok }, { status: ok ? 200 : 403 });
}
