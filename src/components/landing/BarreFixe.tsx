"use client";

import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { LancerLien } from "@/components/accueil/ChampLien";

/** Le bouton principal reste sous le pouce dès que celui du hero sort de l'écran. */
export function BarreFixe() {
  const [visible, setVisible] = useState(false);
  const studio = useContext(LancerLien);

  useEffect(() => {
    const hero = document.getElementById("cta-hero");
    const fin = document.getElementById("cta-fin");
    if (!hero) return;
    const vus = new Map<Element, boolean>();
    const obs = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => vus.set(e.target, e.isIntersecting));
      setVisible(!vus.get(hero) && !(fin && vus.get(fin)));
    });
    obs.observe(hero);
    if (fin) obs.observe(fin);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`pb-sur fixed inset-x-0 lg:hidden bottom-0 z-40 border-t-2 border-encre bg-fond px-4 pt-3 transition-transform duration-300 ${visible ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-[480px]">
        {studio ? (
          <button type="button" onClick={() => studio("")} className="bouton bouton-rose w-full" tabIndex={visible ? 0 : -1}>
            Créer mon premier clip
          </button>
        ) : (
          <Link href="/commencer" className="bouton bouton-rose w-full" tabIndex={visible ? 0 : -1}>
            Créer mon premier clip
          </Link>
        )}
      </div>
    </div>
  );
}
