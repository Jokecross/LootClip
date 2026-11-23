"use client";
/*
 * Abonnements, version démo.
 * Une fois branché : Stripe Checkout pour payer (coupon de lancement si la fenêtre est ouverte),
 * portail client Stripe pour gérer, et le webhook Stripe met à jour l'offre côté serveur.
 */
import { OFFRES_PAYANTES, type OffrePayante, type Periodicite } from "./config";
import { modifier, nouvelId } from "./etat";
import { lancementActif, montant } from "./prix";
import { suivre } from "./suivi";

/** Paiement simulé : 1,2 s d'attente, puis l'offre est active et la facture créée. */
export function souscrire(offre: OffrePayante, periodicite: Periodicite) {
  const remise = lancementActif();
  const m = montant(offre, periodicite, remise);
  suivre("offre_choisie", { offre, periodicite, montant: m });
  return new Promise<void>((ok) =>
    setTimeout(() => {
      const le = new Date().toISOString();
      modifier((e) => ({
        ...e,
        compte: e.compte ? { ...e.compte, offre, periodicite, abonneDepuis: le, remiseLancement: remise } : e.compte,
        factures: [
          { id: `XP-${nouvelId().toUpperCase()}`, le, montant: m, libelle: `XPclip ${OFFRES_PAYANTES[offre].nom}, 1 ${periodicite === "mensuel" ? "mois" : "an"}` },
          ...e.factures,
        ],
      }));
      suivre("paiement_reussi", { offre, periodicite, montant: m });
      ok();
    }, 1200),
  );
}

export function resilier() {
  modifier((e) => ({ ...e, compte: e.compte ? { ...e.compte, offre: "gratuit", periodicite: undefined, abonneDepuis: undefined } : e.compte }));
}
