/*
 * Comptes TikTok et Instagram d'un joueur.
 * GET : la liste. POST { reseau } : adresse de connexion. PUT { ids } : confirme au retour. DELETE { id } : délie.
 * Un compte n'est utilisable qu'une fois confirmé par le navigateur revenu de TikTok ou d'Instagram :
 * envoyer son lien de connexion à quelqu'un d'autre ne donne donc pas accès à son compte.
 */
import { admin, adminConfigure, utilisateurDe } from "@/lib/admin";
import { adresseConnexion, annuler, comptesDe, effacerCompte, lireCompte, publicationOuverte, RESEAUX, type Publication, type Reseau } from "@/lib/postforme";

const FRAICHEUR_MS = 10 * 60_000;

async function entrer(req: Request) {
  if (!adminConfigure()) return { refus: Response.json({ erreur: "ferme" }, { status: 503 }) };
  const user = await utilisateurDe(req);
  if (!user) return { refus: Response.json({ erreur: "non_connecte" }, { status: 401 }) };
  if (!publicationOuverte(user.email)) return { refus: Response.json({ erreur: "ferme" }, { status: 403 }) };
  return { user };
}

const lister = async (userId: string) => {
  const { data, error } = await admin().from("comptes_sociaux").select("id, reseau, pseudo, photo, actif, maj_le").eq("user_id", userId).order("cree_le");
  if (error) throw error;
  return data;
};

export async function GET(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  try {
    let comptes = await lister(user.id);
    // De temps en temps, on relit si les comptes sont toujours reliés.
    if (comptes.some((c) => Date.now() - Date.parse(c.maj_le) > FRAICHEUR_MS)) {
      const vrais = await comptesDe(user.id).catch(() => null);
      if (vrais) {
        const maj_le = new Date().toISOString();
        for (const c of comptes) {
          const v = vrais.find((x) => x.id === c.id);
          await admin().from("comptes_sociaux").update({ actif: v?.status === "connected", ...(v ? { pseudo: v.username, photo: v.profile_photo_url } : {}), maj_le }).eq("id", c.id).eq("user_id", user.id);
        }
        comptes = await lister(user.id);
      }
    }
    return Response.json({ comptes: comptes.map(({ maj_le: _, ...c }) => c) });
  } catch (e) {
    console.error("comptes", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const { reseau } = await req.json().catch(() => ({}));
  if (!RESEAUX.includes(reseau)) return Response.json({ erreur: "reseau" }, { status: 400 });
  // Relier est permis avant de payer (onboarding). Publier demande une offre : voir /api/publication.
  try {
    const deja = (await lister(user.id)).find((c) => c.reseau === reseau && c.actif);
    if (deja) return Response.json({ erreur: "deja_relie" }, { status: 409 });
    return Response.json({ url: await adresseConnexion(user.id, reseau as Reseau) });
  } catch (e) {
    console.error("connexion", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > 5 || ids.some((x) => typeof x !== "string" || !/^[\w-]{4,80}$/.test(x))) return Response.json({ erreur: "invalide" }, { status: 400 });
  try {
    let relies = 0;
    for (const id of ids as string[]) {
      const c = await lireCompte(id);
      if (c.external_id !== user.id || c.status !== "connected" || !RESEAUX.includes(c.platform as Reseau)) continue;
      const { error } = await admin()
        .from("comptes_sociaux")
        .upsert({ id: c.id, user_id: user.id, reseau: c.platform, pseudo: c.username, photo: c.profile_photo_url, actif: true, maj_le: new Date().toISOString() });
      if (error) throw error;
      relies++;
    }
    return Response.json({ relies }, { status: relies ? 200 : 403 });
  } catch (e) {
    console.error("confirmation", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const { user, refus } = await entrer(req);
  if (refus) return refus;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return Response.json({ erreur: "invalide" }, { status: 400 });
  const db = admin();
  try {
    const { data: compte } = await db.from("comptes_sociaux").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!compte) return Response.json({ erreur: "introuvable" }, { status: 404 });
    const { data: lignes } = await db.from("publications").select("*").eq("user_id", user.id).eq("compte_id", id).in("statut", ["envoi", "programmee", "en_cours"]);
    const pubs = (lignes ?? []) as Publication[];
    if (pubs.some((p) => p.statut !== "programmee")) return Response.json({ erreur: "en_cours" }, { status: 409 });
    for (const p of pubs) if (!(await annuler(p))) return Response.json({ erreur: "en_cours" }, { status: 409 });
    await effacerCompte(id);
    await db.from("comptes_sociaux").delete().eq("id", id).eq("user_id", user.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("delier", e);
    return Response.json({ erreur: "indisponible" }, { status: 502 });
  }
}
