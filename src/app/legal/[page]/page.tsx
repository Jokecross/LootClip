import { notFound } from "next/navigation";
import "@/app/accueil.css";
import { LienAccueil } from "@/components/marque/Logo";
import { NON_AFFILIATION, SOCIETE } from "@/lib/config";

/* Textes à faire relire par un juriste. Les infos de la société viennent de SOCIETE (config.ts). */
const S = SOCIETE;

const PAGES: Record<string, { titre: string; blocs: { h: string; p: string[] }[] }> = {
  "mentions-legales": {
    titre: "Mentions légales",
    blocs: [
      { h: "Éditeur", p: [`${S.nom}, ${S.forme}.`, `Siège : ${S.adresse}.`, ...(S.numero ? [`Numéro d'enregistrement : ${S.numero}.`] : []), ...(S.responsable ? [`Responsable de la publication : ${S.responsable}.`] : []), `Contact : ${S.contact}.`] },
      { h: "Hébergeur", p: ["Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Site : vercel.com.", "Les comptes et les vidéos sont stockés par Supabase."] },
      { h: "Marques", p: [NON_AFFILIATION, "YouTube, Twitch, Kick, X et TikTok sont des marques de leurs propriétaires respectifs."] },
    ],
  },
  cgv: {
    titre: "Conditions générales de vente",
    blocs: [
      { h: "Qui vend", p: [`XPclip est édité par ${S.nom}, ${S.forme}. Contact : ${S.contact}.`, "Pour t'abonner, tu dois avoir 18 ans, ou l'accord d'un parent."] },
      {
        h: "Offres",
        p: [
          "XPclip est accessible avec un abonnement payant.",
          "Starter : 9,99 € TTC par mois, 20 vidéos par mois, 1 minute maximum par vidéo, 2 styles de montage, sans filigrane.",
          "Pro : 19,99 € TTC par mois, 60 vidéos par mois, 3 minutes maximum par vidéo, 3 styles de montage, sans filigrane.",
          "Max : 49,99 € TTC par mois, 200 vidéos par mois, et tout ce que contient Pro.",
          "Paiement annuel : -40 % sur le prix mensuel, prélevé en une fois.",
          "Offre de lancement : -20 % pour toute souscription pendant les 14 premiers jours, gardée tant que l'abonnement reste actif.",
          "Les vidéos non utilisées ne se reportent pas au mois suivant.",
        ],
      },
      { h: "Paiement", p: ["Le paiement est traité par Whop, par carte, Apple Pay ou Google Pay.", "L'abonnement se renouvelle tout seul : tous les 30 jours pour le mensuel, tous les 365 jours pour l'annuel."] },
      { h: "Résiliation", p: ["Tu peux résilier à tout moment depuis l'onglet Compte. L'accès reste actif jusqu'à la fin de la période payée.", "Un changement d'offre transforme le reste payé en jours offerts."] },
      {
        h: "Droit de rétractation",
        p: [
          "Tu as 14 jours après ton premier paiement pour changer d'avis, sans donner de raison.",
          `Écris à ${S.contact} avec l'e-mail de ton compte et cette phrase : « Je me rétracte de mon abonnement XPclip. »`,
          "On te rembourse en totalité sous 14 jours, avec le même moyen de paiement. L'accès est alors fermé.",
        ],
      },
      { h: "Ce que fait XPclip", p: ["XPclip monte des vidéos à partir de tes clips. La publication et ce qu'elle rapporte se passent sur les plateformes.", "XPclip ne garantit aucun revenu, aucune vue et aucun abonné.", "Les montants affichés pendant l'inscription sont des objectifs que tu choisis."] },
      { h: "Tes clips", p: ["Tu restes propriétaire de tes clips et de tes vidéos. Tu nous autorises seulement à les traiter pour faire le montage.", "Dépose uniquement des clips que tu as le droit d'utiliser. Respecte les règles de l'éditeur du jeu et des plateformes."] },
      { h: "Un problème", p: [`Écris d'abord à ${S.contact}. On te répond au plus vite.`, "Si le service ne marche pas comme prévu, tu bénéficies des garanties légales.", "Tu gardes toujours les droits que la loi de ton pays donne aux consommateurs."] },
    ],
  },
  confidentialite: {
    titre: "Confidentialité",
    blocs: [
      { h: "Qui s'en occupe", p: [`${S.nom}, ${S.adresse}. Contact : ${S.contact}.`] },
      { h: "Ce qu'on garde", p: ["Ton e-mail, tes réponses à l'inscription, tes clips, tes vidéos, ton abonnement et tes factures.", "Les étapes que tu suis dans l'appli, pour l'améliorer.", "Les pages visitées, ton pays et ton type d'appareil, sans cookie de suivi.", "Avec Google, on reçoit seulement ton e-mail et ton identifiant Google.", "Si tu relies TikTok ou Instagram : ton pseudo, ta photo et l'autorisation de publier pour toi. Jamais ton mot de passe.", "Sans offre, cette autorisation est effacée après 30 jours.", "On ne voit jamais ta carte : elle est gérée par Whop."] },
      { h: "Pourquoi", p: ["Pour fournir le service que tu as choisi, gérer ton abonnement et respecter la loi.", "On ne vend pas tes données."] },
      { h: "Combien de temps", p: ["Tant que ton compte existe. Tu peux tout supprimer depuis l'onglet Compte.", "Les factures sont gardées le temps exigé par la loi."] },
      { h: "Prestataires", p: ["Supabase (comptes et stockage), Vercel (hébergement, montage et statistiques), Whop (paiement), Google (connexion, si tu la choisis), Post for Me (publication, si tu relies tes comptes).", "Certains sont aux États-Unis : tes données peuvent y être traitées."] },
      { h: "Tes droits", p: [`Accès, correction, suppression, copie, opposition : écris à ${S.contact}.`, "Tu peux aussi saisir la CNIL, sur cnil.fr."] },
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
    <main className="v4 pb-16">
      <nav className="nav !max-w-[760px]" aria-label="Menu">
        <LienAccueil />
      </nav>
      <div className="mx-auto max-w-[760px] px-4 lg:px-0">
        <h1 className="titre titre-v4 mt-10 lg:mt-16">{contenu.titre}</h1>
        <div className="bloc mt-7 bg-blanc px-5 pb-8 lg:mt-10 lg:px-10 lg:pb-12">
          {contenu.blocs.map((b) => (
            <section key={b.h} className="pt-8">
              <h2 className="titre text-[26px]">{b.h}</h2>
              {b.p.map((l) => (
                <p key={l} className="mt-2 text-[16px] leading-relaxed text-encre2">
                  {l}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
