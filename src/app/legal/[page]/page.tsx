import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/marque/Logo";
import { NON_AFFILIATION, PURGE_CLIPS_JOURS } from "@/lib/config";

/* Textes à faire valider. Les [À COMPLÉTER] attendent les informations de la société. */
const PAGES: Record<string, { titre: string; blocs: { h: string; p: string[] }[] }> = {
  "mentions-legales": {
    titre: "Mentions légales",
    blocs: [
      { h: "Éditeur", p: ["[À COMPLÉTER : raison sociale, forme, capital]", "[À COMPLÉTER : adresse du siège]", "[À COMPLÉTER : SIREN, TVA intracommunautaire]", "[À COMPLÉTER : directeur de la publication]", "Contact : [À COMPLÉTER : e-mail]"] },
      { h: "Hébergeur", p: ["[À COMPLÉTER : Vercel Inc., adresse]"] },
      { h: "Marques", p: [NON_AFFILIATION, "GTA, PlayStation, PS5 et Xbox sont des marques de leurs propriétaires respectifs."] },
    ],
  },
  cgv: {
    titre: "Conditions générales de vente",
    blocs: [
      {
        h: "Offres",
        p: [
          "Gratuit : 1 vidéo, avec filigrane XPclip, sans carte bancaire.",
          "Starter : 9,99 € TTC par mois, 20 vidéos par mois, sans filigrane.",
          "Pro : 19,99 € TTC par mois, 60 vidéos par mois, tous les styles, montage prioritaire.",
          "Max : 49,99 € TTC par mois, 200 vidéos par mois, plusieurs pages TikTok.",
          "Paiement annuel : -40 % sur le prix mensuel, prélevé en une fois.",
          "Offre de lancement : -20 % pour toute souscription pendant les 14 premiers jours, gardée tant que l'abonnement reste actif.",
        ],
      },
      { h: "Paiement", p: ["Le paiement est traité par Stripe. L'abonnement se renouvelle à chaque échéance, mensuelle ou annuelle.", "Tu peux résilier à tout moment depuis ton compte. L'accès reste actif jusqu'à la fin de la période payée."] },
      { h: "Ce que fait XPclip", p: ["XPclip monte des vidéos à partir de tes clips. La publication et ce qu'elle rapporte se passent sur les plateformes.", "XPclip ne garantit aucun revenu."] },
      { h: "Droit de rétractation", p: ["[À COMPLÉTER : conditions de rétractation pour un service numérique]"] },
    ],
  },
  confidentialite: {
    titre: "Confidentialité",
    blocs: [
      { h: "Ce qu'on garde", p: ["Ton e-mail, tes clips, tes vidéos et les chiffres que tu saisis.", `Tes clips bruts sont supprimés automatiquement après ${PURGE_CLIPS_JOURS} jours.`] },
      { h: "Tes droits", p: ["Tu peux supprimer ton compte et tous tes fichiers depuis l'onglet Compte.", "Pour toute demande : [À COMPLÉTER : e-mail]."] },
      { h: "Prestataires", p: ["[À COMPLÉTER : Supabase (comptes et stockage), Stripe (paiement), Vercel (hébergement), outil de mesure d'audience]"] },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export default async function PageLegale({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const contenu = PAGES[page];
  if (!contenu) notFound();
  return (
    <main className="mx-auto max-w-[680px] px-4 pb-20 pt-4">
      <Link href="/" className="flex min-h-12 w-fit items-center" aria-label="Retour à l'accueil">
        <Logo taille={24} />
      </Link>
      <h1 className="titre mt-8 text-[44px]">{contenu.titre}</h1>
      {contenu.blocs.map((b) => (
        <section key={b.h} className="mt-8">
          <h2 className="titre text-[24px]">{b.h}</h2>
          {b.p.map((l) => (
            <p key={l} className="mt-2 text-[16px] leading-relaxed text-encre2">
              {l}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
