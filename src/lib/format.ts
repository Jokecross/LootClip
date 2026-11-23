import { TAUX } from "./config";

const nf = new Intl.NumberFormat("fr-FR");

export const nombre = (n: number) => nf.format(Math.round(n));

/** 1 200 000 → « 1,2 M » ; 350 000 → « 350 000 » */
export function nombreCourt(n: number) {
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n / 1_000_000)} M`;
  return nombre(n);
}

/** 1 325 000 → « 1,33 million » ; 17 473 → « 17 500 » (arrondi à la centaine) */
export function vuesLisibles(n: number) {
  if (n >= 1_000_000) {
    const m = Math.round(n / 10_000) / 100;
    return `${String(m).replace(".", ",")} million${m >= 2 ? "s" : ""}`;
  }
  return nombre(Math.round(n / 100) * 100);
}

export const dollars = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n).replace("$US", "$");

export const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

/** 75 → « 1 min 15 s » */
export function duree(sec: number) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} s`;
  return r ? `${m} min ${String(r).padStart(2, "0")} s` : `${m} min`;
}

/** 75 → « 1:15 » */
export const chrono = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export function taille(octets: number) {
  if (octets >= 1e9) return `${(octets / 1e9).toFixed(1).replace(".", ",")} Go`;
  return `${Math.max(1, Math.round(octets / 1e6))} Mo`;
}

export const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Fourchette de gains pour un nombre de vues qualifiées sur un mois. */
export function gains(vues: number) {
  return { bas: (vues / 1000) * TAUX.bas, haut: (vues / 1000) * TAUX.haut };
}
