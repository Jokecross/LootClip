"use client";
/*
 * L'écran des offres. Sans abonnement, on n'entre pas dans l'appli : il s'affiche à la fin de
 * l'onboarding (/commencer) et à l'entrée de l'appli (app/layout), sans bouton pour le fermer.
 * Le montant en haut est toujours un « objectif », jamais une estimation de gains.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/marque/Logo";
import { Avantages } from "@/components/tarifs/Avantages";
import { Bascule } from "@/components/tarifs/Bascule";
import { Lancement } from "@/components/tarifs/Lancement";
import { Duo, Titre } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { commander } from "@/lib/abonnement";
import { MENTION_OBJECTIF, ONBOARDING, OFFRES_PAYANTES, PASTILLE_PRO, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { nombre, videos } from "@/lib/format";
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-orange" role="dialog" aria-modal="true" aria-labelledby="t-paywall">
      <Duo
        cle="offres"
        fond="orange"
        large
        entete={
          <div className="flex items-center justify-between gap-4">
            <Logo taille={34} />
            {fermer && (
              <button type="button" onClick={fermer} className="bouton bouton-carre shrink-0 !flex-none" aria-label="Fermer">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        }
        gauche={
          <Titre
            id="t-paywall"
            avant="Ton objectif XPclip"
            sous={`Ton plan : ${videos(frequence)} par semaine.`}
            plus={
              relies.length > 0 && (
                <p className="flex items-center gap-2.5 !text-[15px] font-bold !text-encre lg:!text-[18px]">
                  <span className="flex -space-x-2">
                    {relies.map((c) => (
                      <span key={c.id}>{c.photo ? <Photo url={c.photo} secours={<PictoReseau r={c.reseau} />} /> : <PictoReseau r={c.reseau} />}</span>
                    ))}
                  </span>
                  <span className="min-w-0 truncate">@{relies[0].pseudo ?? "Ton compte"} est prêt à poster.</span>
                </p>
              )
            }
          >
            {nombre(objectifBooste(objectif))}&nbsp;€ par mois
          </Titre>
        }
        droite={
          <>
            <div className="mt-4 grid gap-2.5 lg:mt-0 lg:grid-cols-2 lg:items-center lg:gap-5 lg:[&>div]:w-full">
              <Bascule valeur={periode} changer={setPeriode} />
              <Lancement />
            </div>
            <div className="offres" role="radiogroup" aria-label="Offre">
              {ordre.map((o) => {
                const actif = choix === o;
                const p = montant(o, periode, remise);
                return (
                  <button key={o} type="button" role="radio" aria-checked={actif} onClick={() => setChoix(o)} className={`choix offre surgit ${o === "pro" ? "lg:order-2" : o === "starter" ? "lg:order-1" : "lg:order-3"}`}>
                    <span className="offre-tete">
                      <span className="titre">{OFFRES_PAYANTES[o].nom}</span>
                      {o === conseillee && <span className="pastille bg-rose">{PASTILLE_PRO}</span>}
                      <span className={`choix-rond ${actif ? "choix-rond-oui" : ""}`}>{actif && <Coche className="h-full w-full" />}</span>
                    </span>
                    <span className="titre offre-prix">
                      {libelleJour(parJour(p, periode))} <small>par jour</small>
                    </span>
                    <span className="offre-fact">
                      {libelleFacturation(p, periode)}
                      {remise && <s>{eur(montant(o, periode, false))}</s>}
                    </span>
                    <span className="offre-court">
                      {OFFRES_PAYANTES[o].videosParMois} vidéos par mois{o === conseillee ? ", ton rythme est couvert" : ""}
                    </span>
                    <span className="offre-liste">
                      <Avantages offre={o} plus={o === conseillee ? "Couvre ton rythme" : undefined} />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        }
        action={
          <>
            {refus && (
              <p className="mb-3 rounded-2xl border-2 border-encre bg-jaune p-3 !text-[14px] font-bold !text-encre" role="alert">
                {refus}
              </p>
            )}
            <button type="button" onClick={payer} disabled={paiement} className="bouton bouton-rose w-full">
              {paiement ? "Un instant…" : libelleBouton(choix, prix, periode)}
            </button>
          </>
        }
        pied={
          <>
            <p className="font-bold">Sans engagement. Résiliation en deux clics.</p>
            <p className="max-lg:!text-[11px]">{MENTION_OBJECTIF}</p>
            <div className="flex justify-center gap-6 lg:justify-start">
              {fermer ? (
                <button type="button" onClick={fermer} className="lien flex min-h-9 items-center">
                  Plus tard
                </button>
              ) : (
                <>
                  <Link href="/app/compte" className="lien flex min-h-9 items-center">
                    Mon compte
                  </Link>
                  <button type="button" onClick={deconnexion} className="lien flex min-h-9 items-center">
                    Me déconnecter
                  </button>
                </>
              )}
            </div>
          </>
        }
      />
    </div>,
    document.body,
  );
}
