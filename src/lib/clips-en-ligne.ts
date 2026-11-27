/*
 * « Lien → clips » en ligne : l'état de chaque lot vit dans le stockage (bucket « videos »),
 * la machine de montage récupère la vidéo, le serveur transcrit (Groq) et choisit les moments (Claude),
 * puis la machine monte et dépose les clips.
 *
 *   videos/lots/<utilisateur>/<lot>/etat.json      état lu par l'écran
 *   videos/lots/<utilisateur>/<lot>/son.mp4        son compressé (pour la transcription)
 *   videos/lots/<utilisateur>/<lot>/clip_N.mp4     clips finis
 *   videos/lots/<utilisateur>/compteur-AAAA-MM.json vidéos lancées (champ clips, nom historique) et secondes analysées ce mois-ci
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { admin } from "./admin";
import { apifyActif, estYoutube, lancerApify, resultatApify } from "./apify-youtube";
import { demarrerClips, envoyerRendu, eteindreLot, jetonLot, preparerBase, type TacheClips } from "./atelier";
import type { EtatClips } from "./clips-local";
import type { OptionsClips } from "./clips-options";
import { OFFRES_PAYANTES, type Offre } from "./config";
import { estTesteur } from "./whop";
import { choisirMoments, transcrireSon } from "../../moteur/clip/ia.mjs";

const BUCKET = "videos";
const ID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const idValide = (id: string) => ID.test(id);
const chemin = (user: string, id: string, f: string) => `lots/${user}/${id}/${f}`;
const moisCourant = () => new Date().toISOString().slice(0, 7);

export type EtatLot = EtatClips & { options: OptionsClips; source: string; user: string; /** Run Apify en cours (liens YouTube). */ apify?: string };

/**
 * Lit un petit fichier d'état. Toujours par un lien signé neuf (adresse unique) et sans cache :
 * en ligne, le cache du stockage renvoyait une ancienne version juste après une écriture.
 */
async function lireJson<T>(p: string): Promise<T | null> {
  const { data } = await admin().storage.from(BUCKET).createSignedUrl(p, 60);
  if (!data?.signedUrl) return null;
  const rep = await fetch(`${data.signedUrl}&frais=${Date.now()}`, { cache: "no-store" }).catch(() => null);
  if (!rep?.ok) return null;
  try {
    return (await rep.json()) as T;
  } catch {
    return null;
  }
}
async function ecrireJson(p: string, v: unknown) {
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(p, new Blob([JSON.stringify(v)], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw error;
}

export const lireEtatLot = (user: string, id: string) => lireJson<EtatLot>(chemin(user, id, "etat.json"));
export const ecrireEtatLot = (user: string, id: string, etat: EtatLot) => ecrireJson(chemin(user, id, "etat.json"), etat);

/** Clips restants ce mois-ci pour ce compte (null : illimité, équipe). */
type Compteur = { clips: number; secondes?: number };
const lireCompteur = async (user: string) => (await lireJson<Compteur>(`lots/${user}/compteur-${moisCourant()}.json`)) ?? { clips: 0, secondes: 0 };

async function offreDe(user: string) {
  const { data: profil } = await admin().from("profils").select("offre").eq("id", user).maybeSingle();
  return (profil?.offre ?? "gratuit") as Offre;
}

export async function clipsRestants(user: { id: string; email?: string }) {
  if (estTesteur(user.email)) return null;
  const offre = await offreDe(user.id);
  if (offre === "gratuit") return 0;
  return Math.max(0, OFFRES_PAYANTES[offre].videosParMois - (await lireCompteur(user.id)).clips);
}

/** Secondes de vidéo qu'il reste à analyser ce mois-ci (null : sans limite, équipe). */
export async function secondesRestantes(user: { id: string; email?: string }) {
  if (estTesteur(user.email)) return null;
  const offre = await offreDe(user.id);
  if (offre === "gratuit") return 0;
  return Math.max(0, OFFRES_PAYANTES[offre].heuresParMois * 3600 - ((await lireCompteur(user.id)).secondes ?? 0));
}

async function compter(user: string, n: number, secondes = 0) {
  const p = `lots/${user}/compteur-${moisCourant()}.json`;
  const actuel = await lireCompteur(user);
  await ecrireJson(p, { clips: Math.max(0, actuel.clips + n), secondes: Math.max(0, (actuel.secondes ?? 0) + secondes) });
}

/** Lance un lot. Une vidéo est réservée sur le mois, rendue si rien n'est fabriqué. */
export async function lancerLot({ user, source, options, site }: { user: { id: string; email?: string }; source: string; options: OptionsClips; site: string }) {
  const id = randomUUID();
  const etat: EtatLot = { etape: "telechargement", avancement: 0, moments: [], clips: [], erreur: null, debut: Date.now(), options, source, user: user.id };
  await ecrireEtatLot(user.id, id, etat);
  await compter(user.id, 1);
  try {
    if (apifyActif() && estYoutube(source)) {
      // YouTube : Apify récupère le passage, puis /api/clips/apify lance la machine (apresApify).
      const webhook = `${site}/api/clips/apify?u=${user.id}&id=${id}&j=${jetonLot(`apify:${id}:${user.id}`)}`;
      const run = await lancerApify(source, options.plage, webhook);
      await ecrireEtatLot(user.id, id, { ...etat, apify: run });
    } else {
      await demarrerMachine(user.id, id, source, options.plage, site);
    }
  } catch (e) {
    console.error("lancement du lot", id, e);
    await compter(user.id, -1);
    await ecrireEtatLot(user.id, id, { ...etat, erreur: "Le lancement a échoué. Réessaie dans un instant." });
  }
  return id;
}

async function demarrerMachine(user: string, id: string, source: string, plage: TacheClips["plage"], site: string, direct = false) {
  const { data: depot, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(chemin(user, id, "son.mp4"), { upsert: true });
  if (error) throw error;
  const { prete } = await demarrerClips({ id, source, depotSon: depot.signedUrl, suivi: `${site}/api/clips/suivi?u=${user}`, jeton: jetonLot(`${id}:${user}`), plage, ...(direct ? { direct: true } : {}) });
  if (!prete) preparerBase().catch((e) => console.error("base :", e));
}

/** Apify a fini (webhook) : on relit le résultat et on lance la machine avec le MP4 du passage. */
export async function apresApify(user: string, id: string, run: string, site: string) {
  const etat = await lireEtatLot(user, id);
  if (!etat || etat.erreur || etat.apify !== run) return; // déjà traité, ou appel inconnu
  await ecrireEtatLot(user, id, { ...etat, apify: `${run}:lance` });
  try {
    const res = await resultatApify(run);
    if (!res.ok) {
      console.error("apify", id, res.raison);
      throw new Erreur("Je n'ai pas pu récupérer cette vidéo YouTube. Réessaie, ou envoie le fichier.");
    }
    await demarrerMachine(user, id, res.url, undefined, site, true);
  } catch (e) {
    console.error("après apify", id, e);
    await compter(user, -1);
    await ecrireEtatLot(user, id, { ...etat, erreur: e instanceof Erreur ? e.message : "Le lancement a échoué. Réessaie dans un instant." });
  }
}

/** Le son est déposé : transcription, choix des moments, puis la machine monte. */
export async function traiterSon(user: string, id: string) {
  const etat = await lireEtatLot(user, id);
  if (!etat || etat.erreur) return;
  try {
    await ecrireEtatLot(user, id, { ...etat, etape: "transcription", avancement: 0 });
    const { data: son } = await admin().storage.from(BUCKET).download(chemin(user, id, "son.mp4"));
    if (!son) throw new Error("son introuvable");
    const transcription = await transcrireSon(new Uint8Array(await son.arrayBuffer()));
    if (!transcription.mots.length) throw new Erreur("Je n'ai entendu personne parler dans cette vidéo.");
    // Les heures de vidéo du mois : la vidéo entière est comptée, une fois.
    const { data: proprio } = await admin().auth.admin.getUserById(user);
    const reste = await secondesRestantes({ id: user, email: proprio.user?.email });
    // Durée de la vidéo : donnée par la transcription, sinon la fin du dernier passage parlé.
    const dureeVideo = Number(transcription.duree) || transcription.segments.at(-1)?.fin || 0;
    if (reste !== null && dureeVideo > reste) {
      const h = Math.round(reste / 360) / 10;
      throw new Erreur(reste < 60 ? "Tu as utilisé toutes tes heures de vidéo du mois." : `Cette vidéo dépasse les ${String(h).replace(".", ",")} h de vidéo qu'il te reste ce mois-ci.`);
    }
    await compter(user, 0, Math.round(dureeVideo));

    await ecrireEtatLot(user, id, { ...etat, etape: "choix", avancement: 0 });
    const { nombre, type, duree, plage: _plage, ...reglages } = etat.options;
    const { moments } = await choisirMoments(transcription, { nombre, type, duree });
    if (!moments.length) throw new Erreur("Je n'ai pas trouvé de moment à couper dans cette vidéo.");

    const depots = await Promise.all(
      moments.map(async (_, i) => {
        const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(chemin(user, id, `clip_${i + 1}.mp4`), { upsert: true });
        if (error) throw error;
        return data.signedUrl;
      }),
    );
    // Les moments sont enregistrés AVANT d'être envoyés : la machine répond tout de suite,
    // et ses nouvelles (suivreLot) relisent l'état ; sinon elles écraseraient les moments.
    await ecrireEtatLot(user, id, {
      ...etat,
      etape: "montage",
      avancement: 0,
      moments: moments.map((m) => ({ titre: m.titre, score: m.score, pourquoi: m.pourquoi, forces: m.forces ?? [], duree: Math.round(m.parties.reduce((s, [a, b]) => s + b - a, 0)) })),
    });
    await envoyerRendu(id, { moments, mots: transcription.mots, reglages, depots });
  } catch (e) {
    console.error("traitement du son", id, e);
    await compter(user, -1);
    await ecrireEtatLot(user, id, { ...etat, erreur: e instanceof Erreur ? e.message : "Le montage a échoué. Réessaie dans un instant." });
    await envoyerRendu(id, { moments: [], mots: [], reglages: {}, depots: [], annule: true }).catch(() => {});
    await eteindreLot(id);
  }
}

/** Nouvelles de la machine. */
export async function suivreLot(user: string, id: string, corps: { phase: string; etape?: string; avancement?: number; index?: number; cause?: string }) {
  const etat = await lireEtatLot(user, id);
  if (!etat || etat.erreur) return;
  if (corps.phase === "progres" && corps.etape) {
    await ecrireEtatLot(user, id, { ...etat, etape: corps.etape as EtatLot["etape"], avancement: Math.min(1, Math.max(0, Number(corps.avancement) || 0)) });
  } else if (corps.phase === "clip" && typeof corps.index === "number") {
    const i = corps.index;
    const m = etat.moments[i];
    if (m && !etat.clips.some((c) => c.fichier === `clip_${i + 1}.mp4`)) etat.clips.push({ fichier: `clip_${i + 1}.mp4`, ...m });
    await ecrireEtatLot(user, id, { ...etat, avancement: etat.clips.length / Math.max(1, etat.moments.length) });
  } else if (corps.phase === "fini") {
    await ecrireEtatLot(user, id, { ...etat, etape: "fini", avancement: 1 });
    await admin().storage.from(BUCKET).remove([chemin(user, id, "son.mp4")]);
    await eteindreLot(id);
  } else if (corps.phase === "erreur") {
    const phrases: Record<string, string> = {
      bloque: "Cette plateforme bloque le téléchargement. Envoie plutôt le fichier de ta vidéo.",
      illisible: "Ce lien ne mène pas à une vidéo que je peux lire.",
      privee: "Cette vidéo est privée ou n'existe plus.",
      trop_longue: "Cette vidéo est trop longue (2 h maximum).",
    };
    if (!etat.clips.length) await compter(user, -1);
    await ecrireEtatLot(user, id, { ...etat, erreur: phrases[corps.cause ?? ""] ?? "Le montage a échoué. Réessaie dans un instant." });
    await eteindreLot(id);
  }
}

/** L'état pour l'écran, avec un lien de lecture pour chaque clip fini. */
export async function etatPourEcran(user: string, id: string) {
  const etat = await lireEtatLot(user, id);
  if (!etat) return null;
  const clips = await Promise.all(
    etat.clips.map(async (c) => {
      const { data } = await admin().storage.from(BUCKET).createSignedUrl(chemin(user, id, c.fichier), 3600);
      return { ...c, url: data?.signedUrl };
    }),
  );
  const { user: _u, source: _s, options: _o, ...reste } = etat;
  return { ...reste, clips };
}

/** Les lots de ce compte, du plus récent au plus ancien (30 au plus). */
export async function listerLotsEnLigne(user: string) {
  const { data } = await admin().storage.from(BUCKET).list(`lots/${user}`, { limit: 100 });
  const ids = (data ?? []).map((f) => f.name).filter((n) => ID.test(n));
  const lots = await Promise.all(ids.map(async (id) => ({ id, etat: await etatPourEcran(user, id) })));
  return lots
    .filter((l) => l.etat)
    .map(({ id, etat }) => ({ id, debut: etat!.debut, etape: etat!.etape, erreur: etat!.erreur, clips: etat!.clips }))
    .sort((a, b) => (b.debut ?? 0) - (a.debut ?? 0))
    .slice(0, 30);
}

class Erreur extends Error {}
