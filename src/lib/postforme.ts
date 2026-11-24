/*
 * Post for Me : publication sur TikTok et Instagram (serveur seulement).
 * POSTFORME_API_KEY est une variable Vercel « Sensitive », SANS NEXT_PUBLIC_. Documentation : api.postforme.dev/docs.
 * PUBLICATION_OUVERTE=1 ouvre à tous les abonnés. Sinon, seulement l'équipe (WHOP_TESTEURS).
 */
import "server-only";
import { admin } from "./admin";
import { estTesteur } from "./whop";

export type Reseau = "tiktok" | "instagram";
export const RESEAUX: Reseau[] = ["tiktok", "instagram"];

export type OptionsTiktok = { visibilite: "public" | "friends" | "private"; commentaires: boolean; duos: boolean; collages: boolean; maMarque: boolean; partenaire: boolean };

export type Publication = {
  id: string;
  user_id: string;
  montage_id: string;
  reseau: Reseau;
  compte_id: string;
  pseudo: string | null;
  texte: string;
  options: Partial<OptionsTiktok>;
  statut: "envoi" | "programmee" | "en_cours" | "publiee" | "echouee" | "annulee";
  prevu_le: string | null;
  pfm_id: string | null;
  lien: string | null;
  erreur: string | null;
  verifie_le: string | null;
  cree_le: string;
};

export const publicationConfiguree = () => Boolean(process.env.POSTFORME_API_KEY);
export const publicationOuverte = (email: string | undefined) => publicationConfiguree() && (process.env.PUBLICATION_OUVERTE === "1" || estTesteur(email));

export class ErreurPfm extends Error {
  constructor(public statut: number, message: string) {
    super(message);
  }
}

async function pfm<T>(methode: "GET" | "POST" | "PUT" | "DELETE", chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`https://api.postforme.dev/v1${chemin}`, {
    method: methode,
    headers: { authorization: `Bearer ${process.env.POSTFORME_API_KEY}`, ...(corps === undefined ? {} : { "content-type": "application/json" }) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurPfm(r.status, `${methode} ${chemin.split("?")[0]} ${r.status} ${JSON.stringify(j?.message ?? j?.errors ?? j?.error ?? "").slice(0, 300)}`);
  return j as T;
}

/* ---------- Comptes ---------- */

type ComptePfm = { id: string; platform: string; username: string | null; profile_photo_url: string | null; status: "connected" | "disconnected"; external_id: string | null };

/** Adresse de connexion officielle TikTok ou Instagram. Instagram : connexion directe, sans page Facebook. */
export const adresseConnexion = async (userId: string, reseau: Reseau) =>
  (
    await pfm<{ url: string }>("POST", "/social-accounts/auth-url", {
      platform: reseau,
      external_id: userId,
      permissions: ["posts"],
      force_reauth: true, // laisse toujours choisir le compte
      ...(reseau === "instagram" ? { platform_data: { instagram: { connection_type: "instagram" } } } : {}),
    })
  ).url;

export const lireCompte = (id: string) => pfm<ComptePfm>("GET", `/social-accounts/${encodeURIComponent(id)}`);
export const comptesDe = async (userId: string) => (await pfm<{ data: ComptePfm[] }>("GET", `/social-accounts?external_id=${userId}&limit=50`)).data;

/** Efface le compte et ses jetons. Déjà effacé : rien à faire. */
export async function effacerCompte(id: string) {
  await pfm("DELETE", `/social-accounts/${encodeURIComponent(id)}`).catch((e) => {
    if (!(e instanceof ErreurPfm) || e.statut !== 404) throw e;
  });
}

/* ---------- Publications ---------- */

const JOUR = 86_400;

async function corpsDe(p: Publication, chemin: string) {
  // Post for Me télécharge la vidéo au moment de publier : le lien doit vivre jusque-là, avec trois jours de marge.
  const avance = p.prevu_le ? Math.max(0, (new Date(p.prevu_le).getTime() - Date.now()) / 1000) : 0;
  const { data, error } = await admin().storage.from("videos").createSignedUrl(chemin, Math.round(avance + 3 * JOUR));
  if (error || !data) throw new Error("lien de la vidéo");
  const o = p.options;
  return {
    caption: p.texte,
    scheduled_at: p.prevu_le ? new Date(p.prevu_le).toISOString() : null,
    social_accounts: [p.compte_id],
    media: [{ url: data.signedUrl }],
    external_id: p.id,
    platform_configurations:
      p.reseau === "instagram"
        ? { instagram: { placement: "reels", share_to_feed: true } }
        : {
            tiktok: {
              privacy_status: o.visibilite,
              allow_comment: !!o.commentaires,
              allow_duet: !!o.duos,
              allow_stitch: !!o.collages,
              disclose_your_brand: !!o.maMarque,
              disclose_branded_content: !!o.partenaire,
            },
          },
  };
}

const parExterne = async (id: string) => (await pfm<{ data: { id: string; status: string }[] }>("GET", `/social-posts?external_id=${id}&limit=1`)).data[0]?.id ?? null;

/** Envoie la publication. Réponse perdue en route : on vérifie si elle est passée avant de conclure. */
export async function envoyer(p: Publication, chemin: string): Promise<string> {
  try {
    return (await pfm<{ id: string }>("POST", "/social-posts", await corpsDe(p, chemin))).id;
  } catch (e) {
    if (e instanceof ErreurPfm && e.statut < 500) throw e;
    const trouve = await parExterne(p.id);
    if (!trouve) throw e;
    return trouve;
  }
}

export const deplacer = async (p: Publication, chemin: string) => pfm("PUT", `/social-posts/${encodeURIComponent(p.pfm_id!)}`, await corpsDe(p, chemin));

export async function retirer(pfmId: string) {
  await pfm("DELETE", `/social-posts/${encodeURIComponent(pfmId)}`).catch((e) => {
    if (!(e instanceof ErreurPfm) || e.statut !== 404) throw e;
  });
}

/* ---------- Suivi ---------- */

type Resultat = { post_id: string; success: boolean; error: unknown; platform_data: { url?: string } | null };

const NOM = { tiktok: "TikTok", instagram: "Instagram" };

function messageEchec(reseau: Reseau, brut: string) {
  const t = brut.toLowerCase();
  if (/token|unauthor|expired|permission|scope|auth/.test(t)) return `Reconnecte ton compte ${NOM[reseau]}, puis réessaie.`;
  if (/spam|rate|limit|too many|quota/.test(t)) return `${NOM[reseau]} limite tes publications. Réessaie demain.`;
  if (/privacy|private|unaudited/.test(t)) return "TikTok refuse ce choix de visibilité. Change-le.";
  return `${NOM[reseau]} a refusé la vidéo. Réessaie.`;
}

const ABANDON_MS = 6 * 3_600_000;

/** Relit chez Post for Me les publications parties, et range le résultat. Renvoie les lignes à jour. */
export async function actualiser(lignes: Publication[]): Promise<Publication[]> {
  const t = Date.now();
  const db = admin();
  const dues = lignes
    .filter((p) => ["envoi", "programmee", "en_cours"].includes(p.statut))
    .filter((p) => (p.statut === "envoi" ? t - Date.parse(p.cree_le) > 60_000 : !p.prevu_le || Date.parse(p.prevu_le) <= t))
    .filter((p) => !p.verifie_le || t - Date.parse(p.verifie_le) > 12_000)
    .slice(0, 20);
  if (!dues.length) return lignes;

  const maj = new Map<string, Partial<Publication>>();
  const le = new Date(t).toISOString();
  try {
    // Envoi coupé en plein milieu : passé ou pas ?
    for (const p of dues.filter((x) => !x.pfm_id).slice(0, 3)) {
      const trouve = await parExterne(p.id);
      maj.set(p.id, trouve ? { pfm_id: trouve, statut: "en_cours" } : { statut: "echouee", erreur: "L'envoi a été coupé. Réessaie." });
    }
    const partis = dues.filter((p) => p.pfm_id);
    const resultats = partis.length ? (await pfm<{ data: Resultat[] }>("GET", `/social-post-results?limit=50&${partis.map((p) => `post_id=${encodeURIComponent(p.pfm_id!)}`).join("&")}`)).data : [];
    for (const p of partis) {
      const r = resultats.find((x) => x.post_id === p.pfm_id);
      if (r?.success) maj.set(p.id, { statut: "publiee", lien: /^https:\/\//.test(r.platform_data?.url ?? "") ? r.platform_data!.url! : null, erreur: null });
      else if (r) {
        const brut = typeof r.error === "string" ? r.error : JSON.stringify(r.error ?? "");
        console.error("publication", p.id, p.reseau, brut.slice(0, 500));
        maj.set(p.id, { statut: "echouee", erreur: messageEchec(p.reseau, brut) });
      } else if (t - Date.parse(p.prevu_le ?? p.cree_le) > ABANDON_MS) maj.set(p.id, { statut: "echouee", erreur: `${NOM[p.reseau]} n'a pas répondu. Vérifie ton compte.` });
      else maj.set(p.id, { statut: "en_cours" });
    }
  } catch (e) {
    console.error("suivi publications", e);
    return lignes;
  }

  for (const [id, m] of maj) {
    const p = dues.find((x) => x.id === id)!;
    // « eq statut » : une annulation faite au même moment gagne.
    await db.from("publications").update({ ...m, verifie_le: le }).eq("id", id).eq("statut", p.statut);
    if (m.statut === "publiee") await db.from("montages").update({ partagee_le: le }).eq("id", p.montage_id).is("partagee_le", null);
  }
  return lignes.map((p) => (maj.has(p.id) ? { ...p, ...maj.get(p.id)! } : p));
}

/** Annule une publication programmée. Faux : elle est déjà partie. */
export async function annuler(p: Publication): Promise<boolean> {
  if (p.statut !== "programmee" || !p.pfm_id) return false;
  try {
    await retirer(p.pfm_id);
  } catch (e) {
    if (e instanceof ErreurPfm && e.statut === 400) return false;
    throw e;
  }
  await admin().from("publications").update({ statut: "annulee" }).eq("id", p.id).eq("statut", "programmee");
  return true;
}

/** Suppression du compte XPclip : publications annulées, comptes et jetons effacés. */
export async function toutOublier(userId: string) {
  if (!publicationConfiguree()) return;
  const { data } = await admin().from("publications").select("*").eq("user_id", userId).eq("statut", "programmee");
  for (const p of (data ?? []) as Publication[]) await annuler(p);
  for (const c of await comptesDe(userId)) await effacerCompte(c.id);
}
