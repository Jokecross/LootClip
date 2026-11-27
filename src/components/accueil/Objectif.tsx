"use client";
/* La roue de l'onboarding, dès l'accueil. Le montant choisi est repris dans le parcours. */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Roulette } from "@/components/ui/Roulette";
import { MENTION_OBJECTIF, ONBOARDING } from "@/lib/config";
import { nombre } from "@/lib/format";
import { ecrireReponses, plan } from "@/lib/onboarding";
import { preparer } from "@/lib/sons";

export function Objectif() {
  const [objectif, setObjectif] = useState(ONBOARDING.objectifParDefaut);
  const [vu, setVu] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  // La roue n'est construite qu'à l'approche : elle se lance sous les yeux du visiteur.
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => e.isIntersecting && (setVu(true), o.disconnect()), { threshold: 0.35 });
    // Le son se prépare avant l'arrivée : au premier toucher, rien ne se fige.
    const avant = new IntersectionObserver(([e]) => e.isIntersecting && (preparer(), avant.disconnect()), { rootMargin: "900px 0px" });
    o.observe(boite.current!);
    avant.observe(boite.current!);
    return () => (o.disconnect(), avant.disconnect());
  }, []);
  const p = plan(objectif, ONBOARDING.frequenceParDefaut);
  const parVideo = p.booste / p.parMois;
  return (
    <div className="roue-carte">
      <div className="roue-texte">
        <h2 id="t-objectif" className="titre titre-v4">
          Tu vises combien par mois&nbsp;?
        </h2>
        <p className="mt-3 text-[17px] leading-snug lg:mt-5 lg:text-[21px]">Fais tourner la roue. On te fait un plan simple.</p>
        <p className="titre mt-5 text-[68px] tabular-nums lg:hidden" aria-live="off">
          {nombre(objectif)}&nbsp;€
        </p>
        <p className="mt-3 text-[16px] font-bold leading-snug lg:mt-9 lg:text-[22px]">
          {ONBOARDING.frequenceParDefaut} clips par semaine, soit un objectif de {parVideo < 10 ? parVideo.toFixed(1).replace(".", ",") : nombre(parVideo)}&nbsp;€ par clip.
        </p>
        <Link href="/commencer" onClick={() => ecrireReponses({ objectif })} className="gros gros-rose mt-6 w-full max-w-[420px] max-lg:hidden">
          Viser {nombre(objectif)}&nbsp;€
        </Link>
      </div>
      <div ref={boite} className="roue-boite">
        {vu && <Roulette nu page label="Objectif par mois" valeurs={ONBOARDING.objectifs} valeur={objectif} libelle={(v) => `${nombre(v)} €`} changer={setObjectif} centre={<p className="titre pb-[6%] text-[clamp(56px,5.600vw,92px)] tabular-nums">{nombre(objectif)}&nbsp;€</p>} />}
      </div>
      <div className="roue-bas">
        <Link href="/commencer" onClick={() => ecrireReponses({ objectif })} className="gros gros-rose w-full lg:hidden">
          Viser {nombre(objectif)}&nbsp;€
        </Link>
        <p className="text-[12px] leading-snug max-lg:mt-4 max-lg:text-center lg:text-[14px]">{MENTION_OBJECTIF}</p>
      </div>
    </div>
  );
}
