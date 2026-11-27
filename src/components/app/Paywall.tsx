"use client";
/*
 * L'écran des offres. Sans abonnement, on n'entre pas dans l'appli : il s'affiche à la fin de
 * l'onboarding (/commencer) et à l'entrée de l'appli (app/layout), sans bouton pour le fermer.
 * Le montant en haut est toujours un « objectif », jamais une estimation de gains. Look outil (26/11/2026).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/marque/Logo";
import { Avantages } from "@/components/tarifs/Avantages";
import { Bascule } from "@/components/tarifs/Bascule";
import { Lancement } from "@/components/tarifs/Lancement";
import "@/app/accueil.css";
import "@/app/app/appli.css";
import "@/app/app/outil.css";
import "@/app/lp.css";
import { Coche } from "@/components/ui/Parcours";
import { commander } from "@/lib/abonnement";
import { MENTION_OBJECTIF, ONBOARDING, OFFRES_PAYANTES, PASTILLE_PRO, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { nombre } from "@/lib/format";
import { objectifBooste, offreConseillee } from "@/lib/onboarding";
import { eur, lancementActif, libelleBouton, libelleFacturation, libelleJour, montant, parJour } from "@/lib/prix";
import { deconnecter } from "@/lib/serveur";
import { suivre } from "@/lib/suivi";
import { Photo } from "@/components/onboarding/Reseaux";
import { PictoReseau } from "@/components/studio/Publier";
import { useComptes } from "@/lib/publication";
import { Paiement, type Achat } from "./Paiement";

export type MomentPaywall = "entree" | "telechargement" | "deuxieme_video";

export function Paywall({ ouvert, moment, fermer, apresPaiement }: { ouvert: boolean; moment: MomentPaywall; fermer?: () => void; apresPaiement: () => void }) {
  const etat = useEtat();
  const profil = etat.compte?.profil;
  const objectif = profil?.objectif ?? ONBOARDING.objectifParDefaut;
  const frequence = profil?.frequence ?? ONBOARDING.frequenceParDefaut;
  const conseillee = offreConseillee(frequence);
  const { comptes } = useComptes();
  const relies = comptes?.filter((c) => c.actif) ?? [];
  const [choix, setChoix] = useState<OffrePayante>(conseillee);
  const [periode, setPeriode] = useState<Periodicite>("mensuel");
  const [paiement, setPaiement] = useState(false);
  const [remise, setRemise] = useState(false);
  const [achat, setAchat] = useState<Achat | null>(null);
  const [refus, setRefus] = useState("");

  useEffect(() => {
    if (!ouvert) return;
    setChoix(conseillee);
    setRemise(lancementActif());
    suivre("paywall_affiche", { moment });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ouvert, moment, conseillee]);

  if (!ouvert) return null;

  async function payer() {
    setPaiement(true);
    setRefus("");
    try {
      setAchat({ commande: await commander(choix, periode), offre: choix, periodicite: periode, montant: prix });
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "Le paiement est indisponible. Réessaie.");
    }
    setPaiement(false);
  }

  const prix = montant(choix, periode, remise);

  if (achat)
    return (
      <Paiement
        achat={achat}
        fermer={() => setAchat(null)}
        reussi={() => {
          setAchat(null);
          apresPaiement();
        }}
      />
    );

  // Téléphone : l'offre conseillée en premier. Ordinateur : de la plus petite à la plus grande.
  const ordre: OffrePayante[] = ["pro", "starter", "max"];
  const deconnexion = () => deconnecter().then(() => window.location.assign("/"));

  // Rendu à la racine de la page : rien (barre d'onglets, animation) ne peut passer par-dessus.
  return createPortal(
    <div className="v4 ap-offres-ecran" role="dialog" aria-modal="true" aria-labelledby="t-paywall">
      <div className="ap-offres-in">
        <div className="ap-offres-barre">
          <Logo taille={34} />
          {fermer && (
            <button type="button" onClick={fermer} className="bouton bouton-carre shrink-0 !h-12 !w-12" aria-label="Fermer">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>

        <header className="ap-offres-tete">
          <span className="lp-sur !mb-0">Ton objectif XPclip</span>
          <h1 id="t-paywall" className="titre">
            {nombre(objectifBooste(objectif))}&nbsp;€ par mois
          </h1>
          <p>
            Ton plan : {nombre(frequence)} clip{frequence >= 2 ? "s" : ""} par semaine. Choisis ton offre.
          </p>
          {relies.length > 0 && (
            <p className="mx-auto flex max-w-full items-center justify-center gap-2.5 !text-[15px] font-bold !text-encre">
              <span className="flex -space-x-2">
                {relies.map((c) => (
                  <span key={c.id}>{c.photo ? <Photo url={c.photo} secours={<PictoReseau r={c.reseau} />} /> : <PictoReseau r={c.reseau} />}</span>
                ))}
              </span>
              <span className="min-w-0 truncate">@{relies[0].pseudo ?? "Ton compte"} est prêt à poster.</span>
            </p>
          )}
        </header>

        <div className="ap-offres-reglages">
          <Bascule valeur={periode} changer={setPeriode} />
          <Lancement />
        </div>

        <div className="ap-offres" role="radiogroup" aria-label="Offre">
          {ordre.map((o) => {
            const actif = choix === o;
            const p = montant(o, periode, remise);
            return (
              <button key={o} type="button" role="radio" aria-checked={actif} onClick={() => setChoix(o)} className={`ap-offre ${o === "pro" ? "lg:order-2" : o === "starter" ? "lg:order-1" : "lg:order-3"}`}>
                <span className="ap-offre-tete">
                  <span className="titre">{OFFRES_PAYANTES[o].nom}</span>
                  {o === conseillee && <span className="ap-pastille bg-rose">{PASTILLE_PRO}</span>}
                  <span className="ap-offre-rond" aria-hidden="true">
                    {actif && <Coche className="h-4 w-4" />}
                  </span>
                </span>
                <span className="titre ap-offre-prix">
                  {libelleJour(parJour(p, periode))} <small>par jour</small>
                </span>
                <span className="ap-offre-fact">
                  {libelleFacturation(p, periode)}
                  {remise && <s>{eur(montant(o, periode, false))}</s>}
                </span>
                <span className="avantages">
                  <Avantages offre={o} plus={o === conseillee ? "Couvre ton rythme" : undefined} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="ap-offres-pied">
          <p>{MENTION_OBJECTIF}</p>
          <div className="flex justify-center gap-6">
            {fermer ? (
              <button type="button" onClick={fermer} className="lien flex min-h-12 items-center text-[14px] font-bold text-encre">
                Plus tard
              </button>
            ) : (
              <>
                <Link href="/app/compte" className="lien flex min-h-12 items-center text-[14px] font-bold text-encre">
                  Mon compte
                </Link>
                <button type="button" onClick={deconnexion} className="lien flex min-h-12 items-center text-[14px] font-bold text-encre">
                  Me déconnecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ap-offres-sol">
        <div>
          {refus && (
            <p className="rounded-xl border-2 border-encre bg-jaune p-3 !text-[14px] font-bold" role="alert">
              {refus}
            </p>
          )}
          <p>Sans engagement. Résiliation en deux clics.</p>
          <button type="button" onClick={payer} disabled={paiement} className="bouton bouton-rose">
            {paiement ? "Un instant…" : libelleBouton(choix, prix, periode)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
