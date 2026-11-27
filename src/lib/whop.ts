/*
 * Whop : paiement et abonnements (serveur seulement).
 * La vérité vient toujours de l'API Whop : on relit l'abonnement avant d'écrire dans profils.
 * WHOP_API_KEY et WHOP_WEBHOOK_SECRET sont des variables Vercel « Sensitive », SANS NEXT_PUBLIC_.
 * Les offres et tarifs Whop sont créés par outils/whop-offres.mjs.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { admin } from "./admin";
import { OFFRES_PAYANTES, SITE, type OffrePayante, type Periodicite } from "./config";
import { lancementActif, montant } from "./prix";
import TARIFS_JSON from "./whop-tarifs.json";

type Tarif = { offre: OffrePayante; periodicite: Periodicite; lancement: boolean; /** Ancien prix : encore reconnu, plus proposé. */ ancien?: boolean };
const TARIFS = TARIFS_JSON as Record<string, Tarif>;
const COMPTE = "biz_oY3tbxve2BVew1";
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export const whopConfigure = () => Boolean(process.env.WHOP_API_KEY);

export class ErreurWhop extends Error {
  constructor(public statut: number, message: string) {
    super(message);
  }
}

async function whop<T>(methode: "GET" | "POST" | "PATCH", chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`https://api.whop.com/api/v1${chemin}`, {
    method: methode,
    headers: { authorization: `Bearer ${process.env.WHOP_API_KEY}`, "content-type": "application/json", "api-version-date": "2026-11-22-1" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurWhop(r.status, `${methode} ${chemin.split("?")[0]} ${r.status} ${j?.error?.message ?? ""}`);
  return j as T;
}

type Argent = { amount: string; currency: string } | null;
type Abonnement = {
  id: string;
  status: string;
  variant_id: string;
  metadata: Record<string, string> | null;
  created_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  manage_url: string | null;
};
type Paiement = {
  id: string;
  status: string;
  membership_id: string | null;
  variant_id: string | null;
  metadata: Record<string, string> | null;
  paid_at: string | null;
  total: Argent;
};

/* ---------- Ouverture du paiement ---------- */

/** Les comptes de WHOP_TESTEURS (e-mails séparés par des virgules). */
export function estTesteur(email: string | undefined) {
  const testeurs = (process.env.WHOP_TESTEURS ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  return !!email && testeurs.includes(email.toLowerCase());
}

/** PAIEMENT_OUVERT=1 : tout le monde. Sinon, seulement les testeurs. */
export const paiementOuvert = (email: string | undefined) => process.env.PAIEMENT_OUVERT === "1" || estTesteur(email);

/* ---------- Commande ---------- */

export class DejaAbonne extends Error {}

/** Prépare un paiement. Le prix est choisi ici, jamais par le téléphone. */
export async function creerCommande(user: { id: string }, offre: OffrePayante, periodicite: Periodicite) {
  const { data: p } = await admin().from("profils").select("offre, periodicite, abonnement_fin").eq("id", user.id).maybeSingle();
  if (p && p.offre === offre && p.periodicite === periodicite && !p.abonnement_fin) throw new DejaAbonne();
  const lancement = lancementActif();
  const variante = Object.entries(TARIFS).find(([, t]) => !t.ancien && t.offre === offre && t.periodicite === periodicite && t.lancement === lancement)?.[0];
  if (!variante) throw new Error("tarif introuvable");
  const c = await whop<{ id: string }>("POST", "/checkout_configurations", {
    account_id: COMPTE,
    variant_id: variante,
    metadata: { user_id: user.id },
    redirect_url: `${SITE}/app/merci`,
    // Moyens de paiement qui se renouvellent tout seuls et répondent tout de suite.
    payment_method_configuration: { enabled: ["card", "apple_pay", "google_pay"], disabled: [], include_platform_defaults: false },
  });
  return { commande: c.id, montant: montant(offre, periodicite, lancement) };
}

/* ---------- Abonnement ---------- */

export const lireAbonnement = (id: string) => whop<Abonnement>("GET", `/memberships/${encodeURIComponent(id)}`);

/** past_due : le prélèvement a échoué, Whop réessaie quelques jours. L'accès reste ouvert. */
const donneAcces = (a: Abonnement) => ["active", "trialing", "past_due"].includes(a.status);

const champsPayants = (a: Abonnement, t: Tarif) => ({
  offre: t.offre,
  periodicite: t.periodicite,
  remise_lancement: t.lancement,
  abonne_depuis: a.created_at,
  whop_abonnement: a.id,
  abonnement_fin: a.cancel_at_period_end ? a.current_period_end : null,
});
const CHAMPS_GRATUIT = { offre: "gratuit", periodicite: null, remise_lancement: false, abonne_depuis: null, whop_abonnement: null, abonnement_fin: null };

/** Met le profil à jour d'après l'abonnement Whop. Sans danger si on l'appelle plusieurs fois. */
export async function synchroniser(id: string): Promise<"actif" | "inactif" | "ignore"> {
  const a = await lireAbonnement(id);
  const tarif = TARIFS[a.variant_id];
  const uid = a.metadata?.user_id;
  if (!tarif || !uid || !UUID.test(uid)) return "ignore";

  const db = admin();
  const lire = async () => {
    const { data, error } = await db.from("profils").select("offre, whop_abonnement").eq("id", uid).maybeSingle();
    if (error) throw error;
    return data as { offre: string; whop_abonnement: string | null } | null;
  };
  const profil = await lire();
  if (!profil) {
    // Compte supprimé : on ne doit plus jamais prélever.
    if (donneAcces(a) && !a.cancel_at_period_end) await arreter(a.id, true);
    return "ignore";
  }
  const actuel = profil.whop_abonnement;

  if (!donneAcces(a)) {
    if (actuel !== a.id) return "ignore";
    const { error } = await db.from("profils").update(CHAMPS_GRATUIT).eq("id", uid).eq("whop_abonnement", a.id);
    if (error) throw error;
    return "inactif";
  }

  if (actuel === a.id || !actuel) {
    const requete = db.from("profils").update(champsPayants(a, tarif)).eq("id", uid);
    const { data, error } = await (actuel ? requete.eq("whop_abonnement", a.id) : requete.is("whop_abonnement", null)).select("id");
    if (error) throw error;
    if (data?.length) return "actif";
    return (await lire())?.whop_abonnement === a.id ? "actif" : "ignore";
  }

  // Changement d'offre : le plus récent gagne, l'ancien s'arrête et son reste devient des jours offerts.
  const ancien = await lireAbonnement(actuel);
  if (donneAcces(ancien) && new Date(ancien.created_at) >= new Date(a.created_at)) return "ignore";
  const { data, error } = await db.from("profils").update(champsPayants(a, tarif)).eq("id", uid).eq("whop_abonnement", actuel).select("id");
  if (error) throw error;
  if (!data?.length) return "ignore"; // un autre appel vient de le faire
  if (donneAcces(ancien)) {
    await arreter(ancien.id, true);
    const jours = joursOfferts(ancien, tarif);
    if (jours) await whop("POST", `/memberships/${a.id}/extend`, { days: jours }).catch((e) => console.error("jours offerts", a.id, jours, e));
  }
  return "actif";
}

/** Ce qui reste payé sur l'ancienne offre, converti en jours de la nouvelle. */
function joursOfferts(ancien: Abonnement, nouveau: Tarif) {
  const t = TARIFS[ancien.variant_id];
  if (!t || ancien.status !== "active" || !ancien.current_period_start || !ancien.current_period_end) return 0;
  const debut = new Date(ancien.current_period_start).getTime();
  const fin = new Date(ancien.current_period_end).getTime();
  const reste = Math.min(1, Math.max(0, (fin - Date.now()) / (fin - debut)));
  const jour = montant(nouveau.offre, nouveau.periodicite, nouveau.lancement) / (nouveau.periodicite === "mensuel" ? 30 : 365);
  return Math.min(1095, Math.floor((reste * montant(t.offre, t.periodicite, t.lancement)) / jour));
}

/** Résilie : à la fin de la période payée, ou tout de suite (compte supprimé, changement d'offre). */
export async function arreter(id: string, immediat = false) {
  await whop("POST", `/memberships/${encodeURIComponent(id)}/cancel`, { cancel_at_period_end: !immediat });
}

export async function reprendre(id: string) {
  await whop("PATCH", `/memberships/${encodeURIComponent(id)}`, { cancel_at_period_end: false });
}

/* ---------- Paiement et factures ---------- */

export const lirePaiement = (id: string) => whop<Paiement>("GET", `/payments/${encodeURIComponent(id)}`);

/** Range la facture d'un paiement encaissé, et met l'abonnement à jour. */
export async function enregistrerPaiement(p: Paiement) {
  if (p.status !== "paid") return "en_attente" as const;
  const etat = p.membership_id ? await synchroniser(p.membership_id) : ("ignore" as const);
  const tarif = p.variant_id ? TARIFS[p.variant_id] : undefined;
  let uid: string | undefined = p.metadata?.user_id;
  if ((!uid || !UUID.test(uid)) && p.membership_id) uid = (await lireAbonnement(p.membership_id)).metadata?.user_id;
  if (tarif && uid && UUID.test(uid)) {
    const { error } = await admin()
      .from("factures")
      .upsert(
        {
          id: p.id,
          user_id: uid,
          le: p.paid_at ?? new Date().toISOString(),
          montant: Number(p.total?.amount ?? montant(tarif.offre, tarif.periodicite, tarif.lancement)),
          libelle: `XPclip ${OFFRES_PAYANTES[tarif.offre].nom}, 1 ${tarif.periodicite === "mensuel" ? "mois" : "an"}`,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error && error.code !== "23503") throw error; // 23503 : le compte a été supprimé entre-temps
  }
  return etat;
}

/* ---------- Signature des webhooks ---------- */

/** Whop signe « id.horodatage.corps » en HMAC-SHA256 avec le secret ws_… ; 5 minutes de tolérance. */
export function signatureValide(corps: string, entetes: Headers) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const id = entetes.get("webhook-id");
  const quand = entetes.get("webhook-timestamp");
  const recues = entetes.get("webhook-signature");
  if (!secret || !id || !quand || !recues) return false;
  if (!(Math.abs(Date.now() / 1000 - Number(quand)) < 300)) return false;
  const attendue = createHmac("sha256", secret).update(`${id}.${quand}.${corps}`).digest();
  return recues.split(" ").some((s) => {
    const [version, valeur] = s.split(",");
    if (version !== "v1" || !valeur) return false;
    const b = Buffer.from(valeur, "base64");
    return b.length === attendue.length && timingSafeEqual(b, attendue);
  });
}
