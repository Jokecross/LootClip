/*
 * Calcul et libellés des prix. Le montant prélevé est toujours celui qu'on affiche sur le bouton.
 * Prix par jour : mensuel ÷ 30, annuel ÷ 365.
 */
import { LANCEMENT, OFFRES_PAYANTES, REMISE_ANNUELLE, type OffrePayante, type Periodicite } from "./config";

const arrondi = (x: number) => Math.round(x * 100) / 100;

export const finLancement = () => new Date(LANCEMENT.debut).getTime() + LANCEMENT.jours * 86_400_000;
export const lancementActif = (maintenant = Date.now()) => maintenant >= new Date(LANCEMENT.debut).getTime() && maintenant < finLancement();

/** Montant prélevé à chaque échéance (par mois ou par an). */
export function montant(offre: OffrePayante, periodicite: Periodicite, avecLancement: boolean) {
  const mensuel = OFFRES_PAYANTES[offre].mensuel;
  const base = periodicite === "mensuel" ? mensuel : arrondi(mensuel * 12 * (1 - REMISE_ANNUELLE));
  return avecLancement ? arrondi(base * (1 - LANCEMENT.remise)) : base;
}

export const parJour = (m: number, periodicite: Periodicite) => m / (periodicite === "mensuel" ? 30 : 365);

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** 0,333 → « 33 centimes » ; 1,666 → « 1,67 € » */
export function libelleJour(x: number) {
  const c = Math.round(x * 100);
  return c < 100 ? `${c} centimes` : eur(c / 100);
}

export const unite = (p: Periodicite) => (p === "mensuel" ? "par mois" : "par an");

export function libelleFacturation(m: number, p: Periodicite) {
  return `facturé ${eur(m)} ${unite(p)}`;
}

export function libelleBouton(offre: OffrePayante, m: number, p: Periodicite) {
  return `Passer en ${OFFRES_PAYANTES[offre].nom}, ${eur(m)} ${unite(p)}`;
}

export { eur };
