/*
 * Webhook Whop : paiements, renouvellements, résiliations, remboursements.
 * Le message ne sert que de signal : on relit tout chez Whop avant d'écrire.
 * Une erreur passagère renvoie 500, et Whop réessaie.
 */
import { adminConfigure } from "@/lib/admin";
import { enregistrerPaiement, ErreurWhop, lirePaiement, signatureValide, synchroniser, whopConfigure } from "@/lib/whop";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!adminConfigure() || !whopConfigure()) return new Response(null, { status: 503 });
  const corps = await req.text();
  if (!signatureValide(corps, req.headers)) return new Response(null, { status: 401 });
  const ev = JSON.parse(corps) as { type?: string; data?: { id?: string; payment?: { membership?: { id?: string } } } };
  const id = ev.data?.id ?? "";
  try {
    if (ev.type?.startsWith("membership.") && id.startsWith("mem_")) await synchroniser(id);
    else if (ev.type === "payment.succeeded" && id.startsWith("pay_")) await enregistrerPaiement(await lirePaiement(id));
    else if (ev.type?.startsWith("refund.") && ev.data?.payment?.membership?.id) await synchroniser(ev.data.payment.membership.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("webhook Whop", ev.type, id, e);
    // Introuvable (message d'essai) : inutile de réessayer.
    if (e instanceof ErreurWhop && e.statut === 404) return Response.json({ ok: true });
    return new Response(null, { status: 500 });
  }
}
