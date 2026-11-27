/*
 * Prépare la publication d'un clip : le clip devient une « vidéo » (ligne montages, pris_par = "clips")
 * pour réutiliser l'écran de publication (/app/video/<id>/poster) et Post for Me.
 * POST { index } → { video }. Une seule ligne par clip : un second appel renvoie la même.
 */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { publicationOuverte } from "@/lib/postforme";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!adminConfigure()) return Response.json({ erreur: "ferme" }, { status: 503 });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ erreur: "non_connecte" }, { status: 401 });
  if (!publicationOuverte(user.email)) return Response.json({ erreur: "ferme" }, { status: 403 });
  const { index } = await req.json().catch(() => ({}));
  const { idValide, lireEtatLot } = await import("@/lib/clips-en-ligne");
  if (!idValide(id) || !Number.isInteger(index) || index < 0) return Response.json({ erreur: "invalide" }, { status: 400 });

  const etat = await lireEtatLot(user.id, id);
  const clip = etat?.clips.find((c) => c.fichier === `clip_${index + 1}.mp4`);
  if (!etat || !clip) return Response.json({ erreur: "introuvable" }, { status: 404 });

  const chemin = `lots/${user.id}/${id}/${clip.fichier}`;
  const db = admin();
  const { data: deja } = await db.from("montages").select("id").eq("user_id", user.id).eq("video_chemin", chemin).maybeSingle();
  if (deja) return Response.json({ video: deja.id });

  const { data, error } = await db
    .from("montages")
    .insert({
      user_id: user.id,
      style: "drole",
      statut: "termine",
      etape: 4,
      avancement: 1,
      clips: [],
      duree: Math.round(clip.duree || 30),
      accroche: clip.titre,
      titre: clip.titre,
      legende: clip.titre,
      hashtags: ["#gta6", "#gta", "#clip"],
      filigrane: false,
      video_chemin: chemin,
      pris_par: "clips",
      termine_le: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("publier un clip", error);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
  return Response.json({ video: data.id });
}
