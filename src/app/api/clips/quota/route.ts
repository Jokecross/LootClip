/* Le vrai compteur du mois (vidéos analysées en ligne). Sur le Mac (mode local), pas de compteur serveur. */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { clipsLocaux } from "@/lib/clips-local";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (clipsLocaux() || !adminConfigure()) return Response.json({ utilise: null });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ utilise: null }, { status: 401 });
  const { quotaDuMois } = await import("@/lib/clips-en-ligne");
  return Response.json(await quotaDuMois(user.id), { headers: { "Cache-Control": "no-store" } });
}
