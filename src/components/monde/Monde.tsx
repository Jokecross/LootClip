"use client";
/* La toile 3D, posée une fois pour tout le site. La 3D n'est chargée que si une page pose une ancre. */
import { useEffect, useRef } from "react";
import { ancres, surAncre } from "./store";

/** Charge la 3D d'avance, avant la première ancre (régie du studio). */
let prechauffage = false;
export let prechauffer = () => {
  prechauffage = true;
};

export function Monde() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let moteur: { reveiller: () => void; fermer: () => void } | null = null;
    let demande = false;
    let ferme = false;
    const lancer = () => {
      if (moteur) return moteur.reveiller();
      if (demande) return;
      demande = true;
      import("./moteur")
        .then((m) => {
          if (ferme || !ref.current) return;
          moteur = m.demarrer(ref.current);
          document.documentElement.classList.add("avec3d");
        })
        .catch(() => document.documentElement.classList.add("sans3d"));
    };
    surAncre(lancer);
    prechauffer = lancer;
    if (prechauffage) lancer();
    if (ancres.size) lancer();
    return () => {
      ferme = true;
      surAncre(() => {});
      moteur?.fermer();
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-10 h-full w-full" aria-hidden="true" />;
}
