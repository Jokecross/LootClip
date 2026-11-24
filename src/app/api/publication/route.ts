/*
 * Publications d'un joueur.
 * GET ?video= : la liste, avec l'état relu chez Post for Me. POST : publie ou programme.
 * PATCH { id, quand } : change l'heure. DELETE { id } : annule.
 */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { actualiser, annuler, deplacer, envoyer, ErreurPfm, publicationOuverte, RESEAUX, type OptionsTiktok, type Publication } from "@/lib/postforme";
import { estTesteur } from "@/lib/whop";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const TEXTE_MAX = 2200;
const AVANCE_MIN = 2 * 60_000;
const AVANCE_MAX = 30 * 86_400_000;
const PAR_HEURE = 60;

async function entrer(req: Request) {
  if (!adminConfigure()) return { refus: Response.json({ erreur: "ferme" }, { status: 503 }) };
  const user = await utilisateurDe(req);
  if (!user) return { refus: Response.json({ erreur: "non_connecte" }, { status: 401 }) };
  if (!publicationOuverte(user.email)) return { refus: Response.json({ erreur: "ferme" }, { status: 403 }) };
  return { user };
}

const refuser = (erreur: string, status = 400) => Response.json({ erreur }, { status });

/** Ce que le téléphone a le droit de voir. */
const montrer = (p: Publication) => ({ id: p.id, video: p.montage_id, reseau: p.reseau, pseudo: p.pseudo, statut: p.statut, prevuLe: p.prevu_le, lien: p.lien, erreur: p.erreur, creeLe: p.cree_le });

function lireQuand(v: unknown): string | null | false {
  if (v === null || v === undefined) return null;
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  const avance = t - Date.now();
  return avance >= AVANCE_MIN && avance <= AVANCE_MAX ? new Date(t).toISOString() : false;
}

function lireOptions(o: Record<string, unknown> | undefined): OptionsTiktok | null {
  if (!o || !["public", "friends", "private"].includes(String(o.visibilite))) return null;
  // Une vidéo sponsorisée par un partenaire ne peut pas être privée sur TikTok.
  if (o.partenaire && o.visibilite === "private") return null;
  return { visibilite: o.visibilite as OptionsTiktok["visibilite"], commentaires: !!o.commentaires, duos: !!o.duos, collages: !!o.collages, maMarque: !!o.maMarque, partenaire: !!o.partenaire };
}

export async function GET(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const video = new URL(req.url).searchParams.get("video");
  if (video && !UUID.test(video)) return refuser("invalide");
  let q = admin().from("publications").select("*").eq("user_id", user.id).neq("statut", "annulee");
  if (video) q = q.eq("montage_id", video);
  const { data, error } = await q.order("cree_le", { ascending: false }).limit(video ? 20 : 50);
  if (error) return refuser("indisponible", 502);
  return Response.json({ publications: (await actualiser(data as Publication[])).map(montrer) });
}

export async function POST(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const b = await req.json().catch(() => ({}));
  if (typeof b.video !== "string" || !UUID.test(b.video) || !RESEAUX.includes(b.reseau) || typeof b.texte !== "string") return refuser("invalide");
  const quand = lireQuand(b.quand);
  if (quand === false) return refuser("heure");
  const options = b.reseau === "tiktok" ? lireOptions(b.options) : {};
  if (!options) return refuser("options");

  const db = admin();
  const [{ data: profil }, { data: montage }, { data: compte }, { count }] = await Promise.all([
    db.from("profils").select("offre").eq("id", user.id).maybeSingle(),
    db.from("montages").select("id, statut, filigrane, video_chemin").eq("id", b.video).eq("user_id", user.id).maybeSingle(),
    db.from("comptes_sociaux").select("id, pseudo").eq("user_id", user.id).eq("reseau", b.reseau).eq("actif", true).order("cree_le", { ascending: false }).limit(1).maybeSingle(),
    db.from("publications").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("cree_le", new Date(Date.now() - 3_600_000).toISOString()),
  ]);
  if ((!profil || profil.offre === "gratuit") && !estTesteur(user.email)) return refuser("offre_requise", 403);
  if (!montage || montage.statut !== "termine" || !montage.video_chemin) return refuser("video", 404);
  if (montage.filigrane) return refuser("filigrane", 409);
  if (!compte) return refuser("compte", 409);
  if ((count ?? 0) >= PAR_HEURE) return refuser("trop", 429);

  // La ligne d'abord : la base refuse une deuxième publication de la même vidéo sur le même réseau.
  const { data: ligne, error } = await db
    .from("publications")
    .insert({ user_id: user.id, montage_id: montage.id, reseau: b.reseau, compte_id: compte.id, pseudo: compte.pseudo, texte: b.texte.trim().slice(0, TEXTE_MAX), options, prevu_le: quand })
    .select("*")
    .single();
  if (error) return error.code === "23505" ? refuser("deja", 409) : refuser("indisponible", 502);

  const p = ligne as Publication;
  try {
    const pfm_id = await envoyer(p, montage.video_chemin);
    const maj = { pfm_id, statut: (quand ? "programmee" : "en_cours") as Publication["statut"] };
    await db.from("publications").update(maj).eq("id", p.id);
    return Response.json({ publication: montrer({ ...p, ...maj }) });
  } catch (e) {
    console.error("publier", e);
    // Refus net : la ligne est rangée en échec. Doute (réseau) : elle reste « envoi », le suivi tranchera.
    if (e instanceof ErreurPfm && e.statut < 500) await db.from("publications").update({ statut: "echouee", erreur: "La publication a été refusée. Réessaie." }).eq("id", p.id);
    return refuser(e instanceof ErreurPfm && e.statut === 429 ? "occupe" : "indisponible", 502);
  }
}

async function laSienne(userId: string, id: unknown) {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await admin().from("publications").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return data as Publication | null;
}

export async function PATCH(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const b = await req.json().catch(() => ({}));
  const quand = lireQuand(b.quand);
  if (!quand) return refuser("heure");
  const p = await laSienne(user.id, b.id);
  if (!p) return refuser("introuvable", 404);
  if (p.statut !== "programmee" || !p.pfm_id) return refuser("partie", 409);
  const { data: montage } = await admin().from("montages").select("video_chemin").eq("id", p.montage_id).maybeSingle();
  if (!montage?.video_chemin) return refuser("video", 404);
  try {
    await deplacer({ ...p, prevu_le: quand }, montage.video_chemin);
    await admin().from("publications").update({ prevu_le: quand, verifie_le: null }).eq("id", p.id).eq("statut", "programmee");
    return Response.json({ publication: montrer({ ...p, prevu_le: quand }) });
  } catch (e) {
    console.error("deplacer", e);
    return e instanceof ErreurPfm && e.statut === 400 ? refuser("partie", 409) : refuser("indisponible", 502);
  }
}

export async function DELETE(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const b = await req.json().catch(() => ({}));
  const p = await laSienne(user.id, b.id);
  if (!p) return refuser("introuvable", 404);
  try {
    return (await annuler(p)) ? Response.json({ ok: true }) : refuser("partie", 409);
  } catch (e) {
    console.error("annuler", e);
    return refuser("indisponible", 502);
  }
}
