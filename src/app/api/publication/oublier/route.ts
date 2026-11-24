/* Juste avant la suppression d'un compte XPclip : annule ce qui est programmé et efface les comptes reliés. */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { toutOublier } from "@/lib/postforme";

export async function POST(req: Request) {
  if (!adminConfigure()) return Response.json({ ok: true });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ erreur: "non_connecte" }, { status: 401 });
  try {
    await toutOublier(user.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("oublier", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}
