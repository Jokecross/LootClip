/*
 * Liens YouTube en ligne : YouTube bloque la machine de montage, on passe par Apify
 * (décision de Martin du 27/11/2026, voir CLAUDE.md).
 * Le serveur lance un run avec un webhook ; à la fin, /api/clips/apify lance la machine
 * avec le lien direct du MP4. La machine ne reçoit jamais le token.
 *
 * Acteurs, dans l'ordre des essais :
 * - marielise.dev/youtube-video-downloader : le plus utilisé et le mieux noté (vidéo entière,
 *   la machine coupe ensuite le passage). 0,02 $ la minute de vidéo en 720p, rien si échec.
 * - lurkapi/youtube-video-clipper : en dernier secours (coupe lui-même le passage).
 */
import "server-only";

export type Acteur = "marielise" | "lurkapi";
/** Acteur utilisé à chaque essai (1er, 2e, 3e). */
export const ACTEURS: Acteur[] = ["marielise", "marielise", "lurkapi"];

const API = "https://api.apify.com/v2";
const ID_ACTEUR: Record<Acteur, string> = { marielise: "marielise.dev~youtube-video-downloader", lurkapi: "lurkapi~youtube-video-clipper" };

export const apifyActif = () => Boolean(process.env.APIFY_TOKEN);

export function estYoutube(lien: string) {
  try {
    return /(^|\.)(youtube\.com|youtu\.be)$/i.test(new URL(lien).hostname);
  } catch {
    return false;
  }
}

const enTetes = () => ({ authorization: `Bearer ${process.env.APIFY_TOKEN}`, "content-type": "application/json" });

function entree(acteur: Acteur, lien: string, plage?: { debut: number; fin: number }) {
  if (acteur === "marielise") {
    // Proxy résidentiel coupé : facturé au Mo, il coûterait des dizaines de dollars sur une longue vidéo.
    return { urls: [{ url: lien }], quality: "720", format: "default", residentialProxyMode: "disabled" };
  }
  const e: Record<string, unknown> = { videoUrls: [lien], quality: "720p", format: "mp4" };
  if (plage) e.clips = [{ name: "plage", startTime: String(Math.floor(plage.debut)), endTime: String(Math.ceil(plage.fin)) }];
  return e;
}

/** Lance le run et rend son id. Apify appellera `webhook` à la fin. */
export async function lancerApify(acteur: Acteur, lien: string, plage: { debut: number; fin: number } | undefined, webhook: string) {
  const webhooks = Buffer.from(
    JSON.stringify([{ eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"], requestUrl: webhook }]),
  ).toString("base64");
  const rep = await fetch(`${API}/acts/${ID_ACTEUR[acteur]}/runs?webhooks=${encodeURIComponent(webhooks)}`, {
    method: "POST",
    headers: enTetes(),
    body: JSON.stringify(entree(acteur, lien, plage)),
  });
  if (!rep.ok) throw new Error(`Apify (${acteur}) refuse le lancement (${rep.status}) : ${(await rep.text()).slice(0, 300)}`);
  return String((await rep.json()).data.id);
}

type Ligne = { downloadUrl?: string; videoFileUrl?: string; status?: string; error?: string; errorCode?: string };

/**
 * Résultat d'un run fini, relu chez Apify (on ne croit pas le webhook sur parole).
 * `coupe` : le fichier ne contient déjà que le passage (sinon la machine le coupe).
 */
export async function resultatApify(acteur: Acteur, run: string): Promise<{ ok: true; url: string; coupe: boolean } | { ok: false; raison: string }> {
  const r = await fetch(`${API}/actor-runs/${encodeURIComponent(run)}`, { headers: enTetes() });
  if (!r.ok) return { ok: false, raison: `run introuvable (${r.status})` };
  const donnees = (await r.json()).data;
  const items = (await (await fetch(`${API}/datasets/${donnees.defaultDatasetId}/items?clean=true`, { headers: enTetes() })).json()) as Ligne[];
  const url = acteur === "marielise" ? items.find((l) => l.downloadUrl && l.status !== "failed")?.downloadUrl : items.find((l) => l.videoFileUrl)?.videoFileUrl;
  if (url) return { ok: true, url, coupe: acteur === "lurkapi" };
  const l = items[0];
  return { ok: false, raison: `${acteur} : run ${donnees.status}${l ? ` · ${l.errorCode ?? ""} ${l.error ?? l.status ?? ""}` : ""}` };
}
