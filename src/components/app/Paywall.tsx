"use client";
/*
 * L'écran des offres. Il n'apparaît qu'à deux moments :
 * au téléchargement sans filigrane, et au lancement de la deuxième vidéo.
 * Le montant en haut est toujours un « objectif », jamais une estimation de gains.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bascule } from "@/components/tarifs/Bascule";
import { Lancement } from "@/components/tarifs/Lancement";
import { afficherToast } from "@/components/ui/Toast";
import { commander } from "@/lib/abonnement";
import { MENTION_OBJECTIF, ONBOARDING, OFFRES_PAYANTES, PASTILLE_PRO, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { nombre } from "@/lib/format";
import { objectifBooste, offreConseillee } from "@/lib/onboarding";
import { eur, lancementActif, libelleBouton, libelleFacturation, libelleJour, montant, parJour } from "@/lib/prix";
import { suivre } from "@/lib/suivi";
import { Paiement, type Achat } from "./Paiement";

export type MomentPaywall = "telechargement" | "deuxieme_video";

export function Paywall({ ouvert, moment, fermer, apresPaiement }: { ouvert: boolean; moment: MomentPaywall; fermer: () => void; apresPaiement: () => void }) {
  const etat = useEtat();
  const profil = etat.compte?.profil;
  const objectif = profil?.objectif ?? ONBOARDING.objectifParDefaut;
  const frequence = profil?.frequence ?? ONBOARDING.frequenceParDefaut;
  const conseillee = offreConseillee(frequence);
  const [choix, setChoix] = useState<OffrePayante>(conseillee);
  const [periode, setPeriode] = useState<Periodicite>("mensuel");
  const [paiement, setPaiement] = useState(false);
  const [remise, setRemise] = useState(false);
  const [achat, setAchat] = useState<Achat | null>(null);

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
    try {
      setAchat({ commande: await commander(choix, periode), offre: choix, periodicite: periode, montant: prix });
    } catch (e) {
      afficherToast(e instanceof Error ? e.message : "Le paiement est indisponible. Réessaie.");
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

  // Ordre de la maquette : Pro, Starter, Max. L'offre choisie est en jaune.
  const ordre: OffrePayante[] = ["pro", "starter", "max"];

  // Rendu à la racine de la page : rien (barre d'onglets, animation) ne peut passer par-dessus.
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-fond" role="dialog" aria-modal="true" aria-labelledby="t-paywall">
      <div className="entree mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold">Ton objectif XPclip</p>
            <h1 id="t-paywall" className="titre mt-1 text-[34px]">
              {nombre(objectifBooste(objectif))}&nbsp;€ par mois
            </h1>
            <p className="mt-1.5 text-[14px] text-encre2">Ton plan : {frequence} vidéos par semaine.</p>
          </div>
          <button type="button" onClick={fermer} className="bouton bouton-carre shrink-0" aria-label="Fermer et continuer en gratuit">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <Bascule valeur={periode} changer={setPeriode} />
        </div>
        <div className="mt-3">
          <Lancement />
        </div>

        <div className="mt-3 flex flex-col gap-3" role="radiogroup" aria-label="Offre">
          {ordre.map((o) => {
            const actif = choix === o;
            const p = montant(o, periode, remise);
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setChoix(o)}
                className={`relative w-full p-4 text-left transition-colors ${actif ? "carte-forte bg-jaune" : "carte"} ${o === "pro" ? "mt-2" : ""}`}
              >
                {o === "pro" && <span className="pastille absolute -top-3 right-4 rotate-2 bg-rose">{PASTILLE_PRO}</span>}
                <span className="flex items-end justify-between gap-3">
                  <span>
                    <span className="block text-[13px] font-bold">{OFFRES_PAYANTES[o].nom}</span>
                    <span className={`titre mt-0.5 block ${actif ? "text-[24px]" : "text-[20px]"}`}>{libelleJour(parJour(p, periode))} par jour</span>
                  </span>
                  {!actif && <span className="shrink-0 pb-0.5 text-[13px] font-bold">{OFFRES_PAYANTES[o].videosParMois} vidéos</span>}
                </span>
                <span className="mt-1 block text-[13px]">
                  {libelleFacturation(p, periode)}
                  {remise && <s className="ml-2 text-encre2">{eur(montant(o, periode, false))}</s>}
                </span>
                {actif && (
                  <span className="mt-1.5 block text-[13px]">
                    {OFFRES_PAYANTES[o].videosParMois} vidéos par mois{o === conseillee ? " · Couvre ton rythme de publication" : ""}
                  </span>
                )}
                {!actif && o === conseillee && <span className="mt-1.5 block text-[12px] font-bold">Couvre ton rythme de publication</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6">
          <button type="button" onClick={payer} disabled={paiement} className="bouton bouton-rose w-full text-[16px]">
            {paiement ? "Un instant…" : libelleBouton(choix, prix, periode)}
          </button>
          <p className="mt-3 text-center text-[13px] text-encre2">Sans engagement. Résiliation en deux clics.</p>
          <button type="button" onClick={fermer} className="lien mx-auto mt-1 flex min-h-11 items-center px-4 text-[14px]">
            Continuer en gratuit
          </button>
          <p className="mt-1 text-center text-[11px] text-encre2">{MENTION_OBJECTIF}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
