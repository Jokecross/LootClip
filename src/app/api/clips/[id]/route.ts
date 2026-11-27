/* Où en est la fabrication des clips. */
import { adminConfigure, utilisateurDe } from "@/lib/admin";
import { clipsLocaux, dossierDe, lireEtat } from "@/lib/clips-local";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (clipsLocaux()) {
    if (!dossierDe(id)) return Response.json({ erreur: "introuvable" }, { status: 404 });
    const etat = await lireEtat(id);
    return Response.json(etat ?? { etape: "telechargement", avancement: 0, moments: [], clips: [], erreur: null }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!adminConfigure()) return Response.json({ erreur: "bientot" }, { status: 404 });
  const user = await utilisateurDe(req);
  if (!user) return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const { etatPourEcran, idValide } = await import("@/lib/clips-en-ligne");
  if (!idValide(id)) return Response.json({ erreur: "introuvable" }, { status: 404 });
  const etat = await etatPourEcran(user.id, id);
  if (!etat) return Response.json({ etape: "telechargement", avancement: 0, moments: [], clips: [], erreur: null }, { headers: { "Cache-Control": "no-store" } });
  return Response.json(etat, { headers: { "Cache-Control": "no-store" } });
}
