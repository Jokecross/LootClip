/* Offre payante : remet en file une vidéo gratuite pour la refaire sans filigrane. Même vidéo, donc hors quota. */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (!adminConfigure()) return Response.json({ etat: "service_local" }, { status: 503 });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ etat: "non_connecte" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !UUID.test(id)) return Response.json({ etat: "montage_invalide" }, { status: 400 });
  const db = admin();
  const { data: profil } = await db.from("profils").select("offre").eq("id", user.id).maybeSingle();
  if (!profil || profil.offre === "gratuit") return Response.json({ etat: "offre_requise" }, { status: 403 });
  const { data, error } = await db
    .from("montages")
    .update({ filigrane: false, statut: "en_attente", etape: 0, avancement: 0, erreur: null, pris_par: null, debut_le: null, termine_le: null })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("statut", "termine")
    .eq("filigrane", true)
    .select("id");
  if (error) return Response.json({ etat: "indisponible" }, { status: 502 });
  return Response.json({ etat: data.length ? "relance" : "deja_fait" });
}
