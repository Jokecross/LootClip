"use client";
/* Les trois offres de l'accueil. Prix et avantages viennent de config.ts. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avantages } from "@/components/tarifs/Avantages";
import { Lancement } from "@/components/tarifs/Lancement";
import { OFFRES_PAYANTES, ORDRE_OFFRES, PASTILLE_PRO, type OffrePayante } from "@/lib/config";
import { eur, lancementActif, libelleFacturation, libelleJour, montant, parJour } from "@/lib/prix";

const ORDRE_TEL: Record<OffrePayante, string> = { pro: "order-1 lg:order-2", starter: "order-2 lg:order-1", max: "order-3" };
const FONDS: Record<OffrePayante, string> = { starter: "bg-blanc", pro: "bg-jaune", max: "bg-blanc" };

export function Offres() {
  const [remise, setRemise] = useState(false);
  useEffect(() => setRemise(lancementActif()), []);
  return (
    <>
      <div className="mx-auto mt-7 max-w-[520px] lg:mt-10">
        <Lancement />
      </div>
      <div className="mt-6 flex flex-col gap-5 lg:mt-12 lg:grid lg:grid-cols-3 lg:items-center lg:gap-7">
        {ORDRE_OFFRES.map((o) => {
          const offre = OFFRES_PAYANTES[o];
          const prix = montant(o, "mensuel", remise);
          const pro = o === "pro";
          return (
            <article key={o} className={`bloc relative flex flex-col p-6 lg:p-8 ${FONDS[o]} ${ORDRE_TEL[o]} ${pro ? "lg:py-12" : ""}`}>
              {pro && <span className="etiquette absolute -top-5 right-6 bg-rose">{PASTILLE_PRO}</span>}
              <h3 className="titre text-[26px] lg:text-[30px]">{offre.nom}</h3>
              <p className={`titre mt-3 whitespace-nowrap ${pro ? "text-[46px] lg:text-[clamp(38px,3.6vw,50px)]" : "text-[38px] lg:text-[clamp(34px,3vw,42px)]"}`}>
                {libelleJour(parJour(prix, "mensuel"))}
              </p>
              <p className="mt-1 text-[16px] font-bold">par jour</p>
              <p className="mt-1 text-[14px] text-encre2">
                {libelleFacturation(prix, "mensuel")}
                {remise && <s className="ml-2">{eur(montant(o, "mensuel", false))}</s>}
              </p>
              <div className="avantages mt-5">
                <Avantages offre={o} />
              </div>
              <Link href="/commencer" className={`gros mt-7 w-full ${pro ? "gros-rose" : "gros-blanc"}`}>
                Choisir {offre.nom}
              </Link>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-center text-[15px] lg:mt-10 lg:text-[17px]">
        Sans engagement. Résiliation en deux clics.{" "}
        <Link href="/tarifs" className="lien whitespace-nowrap">
          Voir l&apos;annuel
        </Link>
      </p>
    </>
  );
}
