/* Le studio de tournage est réservé aux comptes de l'équipe (WHOP_TESTEURS). */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { estTesteur } from "@/lib/whop";

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "production") return Response.json({ ok: true });
  if (!adminConfigure()) return Response.json({ ok: false }, { status: 503 });
  const user = await utilisateurDe(req);
  const ok = estTesteur(user?.email);
  return Response.json({ ok }, { status: ok ? 200 : 403 });
}
