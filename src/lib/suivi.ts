/*
 * Suivi : chaque écran de l'onboarding, inscription, première vidéo, paywall affiché, offre choisie, paiement réussi.
 * Pour l'instant, on garde les événements dans le navigateur et on les pousse dans window.dataLayer
 * (prêt pour Google Tag Manager, Plausible ou PostHog). Côté serveur, on les écrira dans la table `evenements`.
 */
export type Evenement = "onboarding_ecran" | "inscription" | "premiere_video" | "paywall_affiche" | "offre_choisie" | "paiement_reussi" | "partage_tiktok" | "reseaux";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function suivre(evenement: Evenement, details: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const ligne = { event: evenement, ...details, le: new Date().toISOString() };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(ligne);
  // Dans la base aussi (table evenements), sans bloquer l'écran.
  import("./supabase")
    .then(async ({ supabase }) => {
      const { data } = await supabase.auth.getSession();
      await supabase.from("evenements").insert({ nom: evenement, details, user_id: data.session?.user.id ?? null });
    })
    .catch(() => {});
  try {
    const journal = JSON.parse(localStorage.getItem("lootclip:suivi") || "[]");
    journal.push(ligne);
    localStorage.setItem("lootclip:suivi", JSON.stringify(journal.slice(-100)));
  } catch {}
}
