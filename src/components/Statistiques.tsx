"use client";
/*
 * Statistiques de visite (Vercel, sans cookie). Les tournages de l'équipe ne sont pas comptés.
 * Seuls les paramètres utm_* sont gardés : aucun code ni jeton de l'adresse n'est envoyé.
 */
import { Analytics } from "@vercel/analytics/next";

export function Statistiques() {
  return (
    <Analytics
      beforeSend={(e) => {
        const u = new URL(e.url);
        if (/(^|; )xp_tournage=1/.test(document.cookie) || /^\/(studio|tournage)/.test(u.pathname)) return null;
        [...u.searchParams.keys()].forEach((k) => k.startsWith("utm_") || u.searchParams.delete(k));
        u.hash = "";
        return { ...e, url: u.toString() };
      }}
    />
  );
}
