/*
 * Liens YouTube en ligne : YouTube bloque la machine de montage, on passe par l'acteur Apify
 * « lurkapi/youtube-video-clipper » (décision de Martin du 27/11/2026, voir CLAUDE.md).
 * Le serveur lance le run avec un webhook ; à la fin, /api/clips/apify lance la machine
 * avec le lien direct du MP4 déjà coupé. La machine ne reçoit jamais le token.
 */
import "server-only";

const ACTEUR = "lurkapi~youtube-video-clipper";
const API = "https://api.apify.com/v2";

export const apifyActif = () => Boolean(process.env.APIFY_TOKEN);

export function estYoutube(lien: string) {
  try {
    return /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(lien).hostname);
  } catch {
    return false;
  }
}

const enTetes = () => ({ authorization: `Bearer ${process.env.APIFY_TOKEN}`, "content-type": "application/json" });

/** Lance le run (passage choisi, 720p) et rend son id. Apify appellera `webhook` à la fin. */
export async function lancerApify(lien: string, plage: { debut: number; fin: number } | undefined, webhook: string) {
  // Champs vérifiés sur le schéma d'entrée de l'acteur (quality, format, clips).
  const input: Record<string, unknown> = { videoUrls: [lien], quality: "720p", format: "mp4" };
  if (plage) input.clips = [{ name: "plage", startTime: String(Math.floor(plage.debut)), endTime: String(Math.ceil(plage.fin)) }];
  const webhooks = Buffer.from(
    JSON.stringify([{ eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"], requestUrl: webhook }]),
  ).toString("base64");
  const rep = await fetch(`${API}/acts/${ACTEUR}/runs?webhooks=${encodeURIComponent(webhooks)}`, { method: "POST", headers: enTetes(), body: JSON.stringify(input) });
  if (!rep.ok) throw new Error(`Apify refuse le lancement (${rep.status}) : ${(await rep.text()).slice(0, 300)}`);
  return String((await rep.json()).data.id);
}

/** Résultat d'un run fini, relu chez Apify (on ne croit pas le webhook sur parole). */
export async function resultatApify(run: string): Promise<{ ok: true; url: string } | { ok: false; raison: string }> {
  const r = await fetch(`${API}/actor-runs/${encodeURIComponent(run)}`, { headers: enTetes() });
  if (!r.ok) return { ok: false, raison: `run introuvable (${r.status})` };
  const donnees = (await r.json()).data;
  if (donnees.status !== "SUCCEEDED") return { ok: false, raison: `run ${donnees.status}` };
  const items = (await (await fetch(`${API}/datasets/${donnees.defaultDatasetId}/items?clean=true`, { headers: enTetes() })).json()) as { videoFileUrl?: string; status?: string }[];
  const ligne = items.find((l) => l.videoFileUrl);
  if (!ligne?.videoFileUrl) return { ok: false, raison: items[0]?.status ?? "aucun fichier renvoyé" };
  return { ok: true, url: ligne.videoFileUrl };
}
