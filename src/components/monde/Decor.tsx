"use client";
/* Le fond plein écran : un aplat, des rayons qui tournent, une trame. La couleur suivante s'ouvre en cercle depuis le dernier clic. */
import { useEffect, useRef, useState } from "react";
import { clic } from "./store";

export type Couleur = "jaune" | "rose" | "turquoise" | "orange" | "fond" | "nuit2";

let precedente: Couleur | null = null;

export function Decor({ couleur, cx = 68, cy = 52, rayons = true }: { couleur: Couleur; cx?: number; cy?: number; rayons?: boolean }) {
  const [paire, setPaire] = useState<{ avant: Couleur | null; ici: Couleur; n: number }>({ avant: null, ici: couleur, n: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const avant = precedente;
    precedente = couleur;
    if (!avant || avant === couleur) {
      setPaire((p) => (p.ici === couleur ? p : { avant: null, ici: couleur, n: p.n + 1 }));
      return;
    }
    setPaire((p) => ({ avant, ici: couleur, n: p.n + 1 }));
  }, [couleur]);

  useEffect(() => {
    if (!paire.avant || !ref.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const at = `${clic.x * 100}% ${clic.y * 100}%`;
    ref.current.animate([{ clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})` }], { duration: 620, easing: "cubic-bezier(.6,0,.25,1)" });
  }, [paire.n, paire.avant]);

  const clair = paire.ici === "fond" || paire.ici === "nuit2";
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {paire.avant && <div className="absolute inset-0" style={{ background: `var(--color-${paire.avant})` }} />}
      <div ref={ref} key={paire.n} className="absolute inset-0 overflow-hidden" style={{ background: `var(--color-${paire.ici})` }}>
        {rayons && <div className="rayons" style={{ left: `${cx}%`, top: `${cy}%`, "--r": paire.ici === "nuit2" ? "#3a1c69" : clair ? "#f8ecdb" : `color-mix(in srgb, var(--color-${paire.ici}), white 24%)` } as React.CSSProperties} />}
        <div className="trame" style={{ "--p": paire.ici === "nuit2" ? "#4a2a75" : `color-mix(in srgb, var(--color-${paire.ici}), var(--color-encre) 16%)` } as React.CSSProperties} />
      </div>
    </div>
  );
}
