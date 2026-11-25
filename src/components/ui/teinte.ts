"use client";
import { useEffect } from "react";

export type Couleur = "jaune" | "rose" | "turquoise" | "orange";
export const teinteDe = (c?: Couleur | null) => (c ? `var(--color-${c})` : "var(--color-fond)");

/** La barre du téléphone (heure, batterie) et le fond prennent la couleur de l'écran. null : ne rien changer. */
export function useTeinte(couleur: Couleur | "" | null) {
  useEffect(() => {
    if (couleur === null) return;
    const balise = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const teinte = getComputedStyle(document.documentElement).getPropertyValue(`--color-${couleur || "fond"}`).trim();
    const avant = [balise?.content ?? "", document.body.style.background];
    if (balise) balise.content = teinte;
    document.body.style.background = teinte;
    return () => {
      if (balise) balise.content = avant[0];
      document.body.style.background = avant[1];
    };
  }, [couleur]);
}
