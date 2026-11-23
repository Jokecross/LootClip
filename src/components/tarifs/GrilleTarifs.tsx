"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { afficherToast } from "@/components/ui/Toast";
import { souscrire } from "@/lib/abonnement";
import { OFFRES_PAYANTES, PASTILLE_PRO, type OffrePayante, type Periodicite } from "@/lib/config";
import { useEtat } from "@/lib/etat";
import { eur, lancementActif, libelleBouton, libelleFacturation, libelleJour, montant, parJour } from "@/lib/prix";
import { Bascule } from "./Bascule";
import { Lancement } from "./Lancement";

const ORDRE: OffrePayante[] = ["pro", "starter", "max"];
const RESUME: Record<OffrePayante, string> = {
  starter: "20 vidéos par mois, sans filigrane.",
  pro: "60 vidéos par mois, tous les styles, montage prioritaire.",
  max: "200 vidéos par mois, plusieurs pages TikTok.",
};

/**
 * Les offres. « compacte » (landing) : cartes seules, sans bascule.
 * Sinon (page Tarifs) : bascule mensuel / annuel et bouton de paiement sur chaque carte.
 */
export function GrilleTarifs({ compacte = false }: { compacte?: boolean }) {
  const etat = useEtat();
  const router = useRouter();
  const [periode, setPeriode] = useState<Periodicite>("mensuel");
  const [remise, setRemise] = useState(false);
  const [paiement, setPaiement] = useState<OffrePayante | null>(null);
  const compte = etat.compte;

  useEffect(() => setRemise(lancementActif()), []);

  async function choisir(o: OffrePayante) {
    setPaiement(o);
    await souscrire(o, periode);
    setPaiement(null);
    afficherToast(`Tu es ${OFFRES_PAYANTES[o].nom}. Bon montage.`);
    router.push("/app/creer");
  }

  return (
    <div className="flex flex-col gap-3">
      {!compacte && <Bascule valeur={periode} changer={setPeriode} />}
      <Lancement />

      {/* Téléphone : Pro en premier. Ordinateur : 3 colonnes, Pro au centre. */}
      <div className="flex flex-col gap-3 lg:mt-4 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-6">
      {ORDRE.map((o) => {
        const offre = OFFRES_PAYANTES[o];
        const prix = montant(o, periode, remise);
        const vedette = o === "pro";
        const actuelle = compte?.offre === o;
        return (
          <article
            key={o}
            className={`relative flex flex-col p-4 lg:p-7 ${vedette ? "carte-forte mt-2 bg-jaune lg:order-2 lg:mt-0 lg:-translate-y-3" : `carte ${o === "starter" ? "lg:order-1" : "lg:order-3"}`}`}
          >
            {vedette && <span className="pastille absolute -top-3 right-4 rotate-2 bg-rose">{PASTILLE_PRO}</span>}
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-bold">{offre.nom}</h3>
                <p className={`titre mt-1 ${vedette ? "text-[28px] lg:text-[34px]" : "text-[22px] lg:text-[28px]"}`}>{libelleJour(parJour(prix, periode))} par jour</p>
              </div>
              {!vedette && <span className="shrink-0 pb-1 text-[14px] font-bold lg:hidden">{offre.videosParMois} vidéos</span>}
            </div>
            <p className="mt-1 text-[14px]">
              {libelleFacturation(prix, periode)}
              {remise && <s className="ml-2 text-encre2">{eur(montant(o, periode, false))}</s>}
            </p>
            {vedette ? (
              <>
                <p className="mt-2 text-[14px] lg:mt-5 lg:text-[16px]">{RESUME.pro}</p>
                <p className="mt-1 text-[14px] font-bold lg:text-[16px]">Le prix d&apos;un skin par mois.</p>
              </>
            ) : (
              <p className="mt-5 hidden text-[16px] lg:block">{RESUME[o]}</p>
            )}
            <span className="hidden flex-1 lg:block" aria-hidden="true" />
            {!compacte &&
              (actuelle ? (
                <p className="mt-4 text-center text-[14px] font-bold lg:mt-7">Ton offre actuelle</p>
              ) : compte ? (
                <button type="button" onClick={() => choisir(o)} disabled={!!paiement} className={`bouton mt-4 w-full text-[16px] lg:mt-7 lg:px-3 lg:text-[15px] ${vedette ? "bouton-rose" : "bouton-blanc"}`}>
                  {paiement === o ? "Paiement en cours…" : libelleBouton(o, prix, periode)}
                </button>
              ) : (
                <Link href="/commencer" className={`bouton mt-4 w-full text-[16px] lg:mt-7 lg:px-3 lg:text-[15px] ${vedette ? "bouton-rose" : "bouton-blanc"}`}>
                  {libelleBouton(o, prix, periode)}
                </Link>
              ))}
          </article>
        );
      })}
      </div>

      <p className="mt-2 text-center text-[13px] leading-relaxed text-encre2 lg:mt-6 lg:text-[15px]">
        Sans engagement. Résiliation en deux clics. Première vidéo gratuite avec filigrane.
        {compacte && (
          <>
            {" "}
            <Link href="/tarifs" className="lien text-encre">
              Voir l&apos;annuel
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
