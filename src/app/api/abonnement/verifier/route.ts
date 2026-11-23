/* Juste après le paiement : on relit le paiement chez Whop et on ouvre l'offre sans attendre le webhook. */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { enregistrerPaiement, lirePaiement, whopConfigure } from "@/lib/whop";

export async function POST(req: Request) {
  if (!adminConfigure() || !whopConfigure()) return Response.json({ etat: "ferme" }, { status: 503 });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ etat: "non_connecte" }, { status: 401 });
  const { paiement } = await req.json().catch(() => ({}));
  if (typeof paiement !== "string" || !/^pay_\w+$/.test(paiement)) return Response.json({ etat: "invalide" }, { status: 400 });
  try {
    const p = await lirePaiement(paiement);
    if (p.metadata?.user_id !== user.id) return Response.json({ etat: "invalide" }, { status: 403 });
    return Response.json({ etat: await enregistrerPaiement(p) });
  } catch (e) {
    console.error("verifier", e);
    return Response.json({ etat: "en_attente" });
  }
}
