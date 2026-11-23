/*
 * Abonnement du compte connecté.
 * GET : lien Whop pour gérer la carte. POST { action } : « resilier » (fin de période), « reprendre », « arreter » (tout de suite).
 */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { arreter, lireAbonnement, reprendre, synchroniser, whopConfigure } from "@/lib/whop";

const PAR_DEFAUT = "https://whop.com/@me/settings/orders";

async function abonnementDe(req: Request) {
  if (!adminConfigure() || !whopConfigure()) return { refus: Response.json({ erreur: "ferme" }, { status: 503 }) };
  const user = await utilisateurDe(req);
  if (!user) return { refus: Response.json({ erreur: "non_connecte" }, { status: 401 }) };
  const { data, error } = await admin().from("profils").select("whop_abonnement").eq("id", user.id).maybeSingle();
  if (error) return { refus: Response.json({ erreur: "indisponible" }, { status: 502 }) };
  return { id: data?.whop_abonnement as string | null };
}

export async function GET(req: Request) {
  const { refus, id } = await abonnementDe(req);
  if (refus) return refus;
  const a = id ? await lireAbonnement(id).catch(() => null) : null;
  return Response.json({ lien: a?.manage_url ?? PAR_DEFAUT });
}

export async function POST(req: Request) {
  const { refus, id } = await abonnementDe(req);
  if (refus) return refus;
  const { action } = await req.json().catch(() => ({}));
  if (!["resilier", "reprendre", "arreter"].includes(action)) return Response.json({ erreur: "action_invalide" }, { status: 400 });
  if (!id) return Response.json({ ok: true }); // rien à faire : pas d'abonnement
  try {
    if (action === "reprendre") await reprendre(id);
    else await arreter(id, action === "arreter");
    await synchroniser(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("abonnement", action, e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}
