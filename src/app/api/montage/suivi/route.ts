/*
 * Nouvelles envoyées par la machine de montage : avancement, fin ou échec.
 * Le jeton ne vaut que pour l'essai en cours de ce montage (voir jetonMontage).
 */
import { after } from "next/server";
import { admin, adminConfigure } from "@/lib/admin";
import { champsEchec, eteindre, jetonValide } from "@/lib/atelier";

export const maxDuration = 60;

const MESSAGES: Record<string, string> = {
  introuvable: "Un de tes clips est introuvable. Renvoie-les et relance le montage.",
  illisible: "Un de tes clips est illisible. Essaie de l'exporter à nouveau depuis ta console.",
  autre: "Le montage n'a pas pu aboutir. Relance-le, il ne compte pas dans ton quota.",
};
const refus = (status: number) => new Response(null, { status });

export async function POST(req: Request) {
  if (!adminConfigure()) return refus(503);
  const corps = await req.json().catch(() => null);
  const jeton = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!jeton || typeof corps?.id !== "string") return refus(401);

  const db = admin();
  const { data: m } = await db.from("montages").select("id, user_id, statut, debut_le, avancement, video_chemin").eq("id", corps.id).maybeSingle();
  if (!m?.debut_le || !jetonValide(jeton, m.id, m.debut_le)) return refus(401);
  if (m.statut !== "en_cours") return Response.json({ ok: true }); // déjà fini : la machine peut s'arrêter

  const ecrire = async (champs: Record<string, unknown>) => {
    const { error } = await db.from("montages").update(champs).eq("id", m.id).eq("statut", "en_cours");
    if (error) throw error;
  };
  const fermer = () =>
    after(async () => {
      const u = await eteindre(m.id);
      console.log("montage", m.id, corps.fini ? "terminé" : `échoué (${corps.echec}) ${corps.detail ?? ""}`, u ? `${Math.round((u.activeCpuDurationMs ?? 0) / 1000)} s de calcul` : "");
    });

  if (corps.fini) {
    const chemin = `${m.user_id}/${m.id}.mp4`;
    const { data: existe } = await db.storage.from("videos").exists(chemin);
    if (!existe) return refus(409);
    await ecrire({ statut: "termine", etape: 4, avancement: 1, video_chemin: chemin, termine_le: new Date().toISOString() });
    fermer();
  } else if (corps.echec) {
    await ecrire(champsEchec(m, MESSAGES[corps.echec] ?? MESSAGES.autre));
    fermer();
  } else {
    const a = Number(corps.avancement);
    const etape = Math.round(Number(corps.etape));
    if (!(a >= 0 && a <= 1) || !(etape >= 0 && etape <= 3)) return refus(400);
    if (a > m.avancement) await ecrire({ etape, avancement: a });
  }
  return Response.json({ ok: true });
}
