"use client";
/*
 * Abonnements : le paiement se fait chez Whop, affiché dans la page (components/app/Paiement.tsx).
 * L'offre n'est jamais écrite d'ici : le serveur la lit chez Whop puis met à jour le profil.
 */
import type { OffrePayante, Periodicite } from "./config";
import { rafraichir } from "./serveur";
import { supabase } from "./supabase";
import { suivre } from "./suivi";

async function appeler(chemin: string, corps?: unknown) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(chemin, {
    method: corps === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  return { ok: r.ok, j: await r.json().catch(() => ({})) };
}

const MESSAGES: Record<string, string> = {
  ferme: "Les offres ouvrent très bientôt.",
  non_connecte: "Ta session a expiré. Reconnecte-toi.",
};

/** Prépare le paiement. Renvoie l'identifiant de commande Whop, ou lève un message lisible. */
export async function commander(offre: OffrePayante, periodicite: Periodicite): Promise<string> {
  suivre("offre_choisie", { offre, periodicite });
  const { ok, j } = await appeler("/api/abonnement/commande", { offre, periodicite }).catch(() => ({ ok: false, j: {} as Record<string, string> }));
  if (!ok || !j.commande) throw new Error(MESSAGES[j.erreur] ?? "Le paiement est indisponible. Réessaie.");
  return j.commande;
}

/** Attend que l'offre soit ouverte (quelques secondes), puis recharge le compte. */
export async function confirmer(paiement: string): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    const { j } = await appeler("/api/abonnement/verifier", { paiement }).catch(() => ({ j: {} as Record<string, string> }));
    if (j.etat === "actif") {
      suivre("paiement_reussi", { paiement });
      await rafraichir();
      return true;
    }
    if (j.etat === "invalide") return false;
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  await rafraichir();
  return false;
}

async function agir(action: "resilier" | "reprendre" | "arreter") {
  const { ok } = await appeler("/api/abonnement/resilier", { action }).catch(() => ({ ok: false }));
  if (!ok) throw new Error("Impossible pour l'instant. Réessaie.");
}

/** Résilie à la fin de la période payée. */
export async function resilier() {
  await agir("resilier");
  await rafraichir();
}

export async function reprendre() {
  await agir("reprendre");
  await rafraichir();
}

/** Arrête tout de suite (suppression du compte). */
export const arreter = () => agir("arreter");

/** Page Whop où le joueur change sa carte. */
export async function lienGestion(): Promise<string> {
  const { j } = await appeler("/api/abonnement/resilier").catch(() => ({ j: {} as Record<string, string> }));
  return j.lien ?? "https://whop.com/@me/settings/orders";
}
