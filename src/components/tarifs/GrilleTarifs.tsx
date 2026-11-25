"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { afficherToast } from "@/components/ui/Toast";
import { Paiement, type Achat } from "@/components/app/Paiement";
import { commander } from "@/lib/abonnement";
import { OFFRES_PAYANTES, PASTILLE_PRO, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { eur, lancementActif, libelleBouton, libelleFacturation, libelleJour, montant, parJour } from "@/lib/prix";
import { Avantages } from "./Avantages";
import { Bascule } from "./Bascule";
import { Lancement } from "./Lancement";

const ORDRE: OffrePayante[] = ["pro", "starter", "max"];

/** Les offres de la page Tarifs : mensuel ou annuel, et le bouton de paiement sur chaque carte. */
export function GrilleTarifs() {
  const etat = useEtat();
  const router = useRouter();
  const [periode, setPeriode] = useState<Periodicite>("mensuel");
  const [remise, setRemise] = useState(false);
  const [paiement, setPaiement] = useState<OffrePayante | null>(null);
  const [achat, setAchat] = useState<Achat | null>(null);
  const [refus, setRefus] = useState<{ offre: OffrePayante; texte: string } | null>(null);
  const compte = etat.compte;

  useEffect(() => setRemise(lancementActif()), []);

  async function choisir(o: OffrePayante) {
    setPaiement(o);
    setRefus(null);
    try {
      setAchat({ commande: await commander(o, periode), offre: o, periodicite: periode, montant: montant(o, periode, remise) });
    } catch (e) {
      setRefus({ offre: o, texte: e instanceof Error ? e.message : "Le paiement est indisponible. Réessaie." });
    }
    setPaiement(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {achat && (
        <Paiement
          achat={achat}
          fermer={() => setAchat(null)}
          reussi={() => {
            setAchat(null);
            afficherToast(`Tu es ${OFFRES_PAYANTES[achat.offre].nom}. Bon montage.`);
            router.push("/app/creer");
          }}
        />
      )}
      <div className="mx-auto grid w-full max-w-[860px] gap-3 lg:grid-cols-2 lg:items-center lg:gap-5 lg:[&>div]:w-full">
        <Bascule valeur={periode} changer={setPeriode} />
        <Lancement />
      </div>

      {/* Téléphone : Pro en premier. Ordinateur : 3 colonnes, Pro au centre. */}
      <div className="mt-3 flex flex-col gap-5 lg:mt-10 lg:grid lg:grid-cols-3 lg:items-center lg:gap-7">
        {ORDRE.map((o) => {
          const offre = OFFRES_PAYANTES[o];
          const prix = montant(o, periode, remise);
          const vedette = o === "pro";
          const actuelle = compte?.offre === o;
          return (
            <article key={o} className={`bloc relative flex flex-col p-6 lg:p-8 ${vedette ? "bg-jaune lg:order-2 lg:py-12" : `bg-blanc ${o === "starter" ? "lg:order-1" : "lg:order-3"}`}`}>
              {vedette && <span className="etiquette absolute -top-5 right-6 bg-rose">{PASTILLE_PRO}</span>}
              <h2 className="titre text-[26px] lg:text-[30px]">{offre.nom}</h2>
              <p className={`titre mt-3 whitespace-nowrap ${vedette ? "text-[46px] lg:text-[clamp(38px,3.600vw,50px)]" : "text-[38px] lg:text-[clamp(34px,3vw,42px)]"}`}>{libelleJour(parJour(prix, periode))}</p>
              <p className="mt-1 text-[16px] font-bold">par jour</p>
              <p className="mt-1 text-[14px]">
                {libelleFacturation(prix, periode)}
                {remise && <s className="ml-2 opacity-65">{eur(montant(o, periode, false))}</s>}
              </p>
              <div className="avantages mt-5">
                <Avantages offre={o} />
              </div>
              {refus?.offre === o && (
                <p className="mt-5 rounded-2xl border-2 border-encre bg-rose p-3 text-center text-[15px] font-bold" role="alert">
                  {refus.texte}
                </p>
              )}
              {actuelle ? (
                <p className="mt-7 text-center text-[17px] font-bold">Ton offre actuelle</p>
              ) : compte ? (
                <button type="button" onClick={() => choisir(o)} disabled={!!paiement} className={`bouton mt-7 w-full text-balance !text-[16px] ${vedette ? "bouton-rose" : "bouton-blanc"}`}>
                  {paiement === o ? "Un instant…" : libelleBouton(o, prix, periode)}
                </button>
              ) : (
                <Link href="/commencer" className={`bouton mt-7 w-full text-balance !text-[16px] ${vedette ? "bouton-rose" : "bouton-blanc"}`}>
                  {libelleBouton(o, prix, periode)}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      {compte && compte.offre !== "gratuit" && <p className="mt-5 text-center text-[15px] font-bold">Tu changes d&apos;offre ? Le reste payé devient des jours offerts.</p>}
      <p className="mt-4 text-center text-[15px] font-medium lg:mt-8 lg:text-[17px]">Sans engagement. Résiliation en deux clics.</p>
    </div>
  );
}
