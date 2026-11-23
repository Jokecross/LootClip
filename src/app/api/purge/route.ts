/*
 * Ménage quotidien (vercel.json) : supprime les clips bruts de plus de 14 jours, comme annoncé aux joueurs.
 * Un clip repris par un montage récent est gardé. Les vidéos montées ne sont jamais touchées.
 */
import { timingSafeEqual } from "node:crypto";
import { admin, adminConfigure } from "@/lib/admin";
import { PURGE_CLIPS_JOURS } from "@/lib/config";

export const maxDuration = 300;

const PAGE = 100;

function autorise(req: Request) {
  const secret = process.env.CRON_SECRET;
  const recu = Buffer.from(req.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${secret}`);
  return !!secret && recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

export async function GET(req: Request) {
  if (!adminConfigure()) return new Response(null, { status: 503 });
  if (!autorise(req)) return new Response(null, { status: 401 });
  const db = admin();
  const limite = new Date(Date.now() - PURGE_CLIPS_JOURS * 86_400_000).toISOString();

  // Clips encore utiles : montages récents, ou pas finis.
  const utiles = new Set<string>();
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from("montages").select("clips").or(`cree_le.gte.${limite},statut.in.(en_attente,en_cours)`).order("id").range(de, de + 999);
    if (error) return new Response("montages", { status: 500 });
    for (const m of data) for (const c of (m.clips ?? []) as { chemin?: string }[]) if (c.chemin) utiles.add(c.chemin);
    if (data.length < 1000) break;
  }

  const clips = db.storage.from("clips");
  let supprimes = 0;
  for (let d = 0; ; d += PAGE) {
    const { data: dossiers, error } = await clips.list("", { limit: PAGE, offset: d, sortBy: { column: "name", order: "asc" } });
    if (error) return new Response("dossiers", { status: 500 });
    for (const dossier of dossiers) {
      const vieux: string[] = [];
      for (let o = 0; ; o += PAGE) {
        const { data: fichiers } = await clips.list(dossier.name, { limit: PAGE, offset: o, sortBy: { column: "created_at", order: "asc" } });
        for (const f of fichiers ?? []) {
          const chemin = `${dossier.name}/${f.name}`;
          if (f.created_at && f.created_at < limite && !utiles.has(chemin)) vieux.push(chemin);
        }
        if ((fichiers?.length ?? 0) < PAGE) break;
      }
      for (let i = 0; i < vieux.length; i += PAGE) {
        const { error: e } = await clips.remove(vieux.slice(i, i + PAGE));
        if (!e) supprimes += Math.min(PAGE, vieux.length - i);
      }
    }
    if (dossiers.length < PAGE) break;
  }
  return Response.json({ supprimes });
}
