/* Prépare le paiement d'une offre : renvoie l'identifiant de commande à afficher dans la page. */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { OFFRES_PAYANTES, type OffrePayante } from "@/lib/config";
import { creerCommande, paiementOuvert, whopConfigure } from "@/lib/whop";

export async function POST(req: Request) {
  if (!adminConfigure() || !whopConfigure()) return Response.json({ erreur: "ferme" }, { status: 503 });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ erreur: "non_connecte" }, { status: 401 });
  if (!paiementOuvert(user.email)) return Response.json({ erreur: "ferme" }, { status: 403 });
  const { offre, periodicite } = await req.json().catch(() => ({}));
  if (!Object.hasOwn(OFFRES_PAYANTES, String(offre)) || !["mensuel", "annuel"].includes(periodicite)) return Response.json({ erreur: "offre_invalide" }, { status: 400 });
  try {
    return Response.json(await creerCommande(user, offre as OffrePayante, periodicite));
  } catch (e) {
    console.error("commande", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}
