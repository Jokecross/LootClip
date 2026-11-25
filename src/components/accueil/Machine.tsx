"use client";
/*
 * La machine XPclip, en trois temps : la télé joue, la machine (notre logo) avale le clip, le téléphone joue la vidéo.
 * Une seule vidéo à la fois : deux ensemble font tomber Chrome à 30 images par seconde.
 */
import { useEffect, useRef, useState } from "react";
import { Objet } from "@/components/objets/Objet";
import { Boucle } from "./Boucle";

const Coeur = ({ i }: { i: number }) => (
  <svg viewBox="0 0 24 24" className="coeur" style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
    <path d="M12 20.500S3 15 3 8.800A4.700 4.700 0 0 1 12 7a4.700 4.700 0 0 1 9 1.800C21 15 12 20.500 12 20.500z" fill={["#F05FA5", "#FFFFFF", "#6FE3D6"][i % 3]} stroke="#1A0B2E" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const TEMPS = [3400, 2500, 5600];

export function Machine() {
  const [phase, setPhase] = useState(0);
  const [vue, setVue] = useState(true);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVue(e.isIntersecting), { threshold: 0.1 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vue || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setPhase((p) => (p + 1) % 3), TEMPS[phase]);
    return () => clearTimeout(id);
  }, [phase, vue]);
  return (
    <>
    <div ref={boite} className="machine" data-phase={phase} aria-hidden="true">
      <div className="m-tele">
        <div className="m-ecran">
          <Boucle nom="brut" actif={phase === 0} reprise />
          <span className="m-flash" />
          <span className="m-rec">
            {phase === 0 ? <i /> : <svg viewBox="0 0 24 24"><path d="M5 12.800l4.400 4.400L19 7.400" fill="none" stroke="currentColor" strokeWidth="3.600" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {phase === 0 ? "En jeu" : "Clip gardé"}
          </span>
        </div>
        <span className="m-pied" />
        <Objet nom="manette" className="m-manette" />
      </div>

      <div className="m-tube m-tube-1">
        <span className="m-passe">
          <img src="/v4/chien.webp" alt="" width={480} height={270} />
        </span>
      </div>

      <div className="m-corps">
        <span className="m-antenne" />
        <svg viewBox="0 0 100 100" className="m-logo">
          <rect x="1" y="1" width="98" height="98" rx="26" fill="#F05FA5" stroke="#1A0B2E" strokeWidth="2" />
          <g style={{ fontFamily: "var(--font-titre)", fontWeight: 800 }}>
            <text x="52.500" y="60" textAnchor="middle" fontSize="50" fill="#1A0B2E">
              XP
            </text>
            <text x="50" y="57" textAnchor="middle" fontSize="50" fill="#FDF5EA" stroke="#1A0B2E" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">
              XP
            </text>
          </g>
          <rect x="16" y="69" width="68" height="14" rx="7" fill="#FFFFFF" stroke="#1A0B2E" strokeWidth="2.500" />
          <rect x="17.500" y="70.500" width="65" height="11" rx="5.500" fill="#F9D477" className="m-xp" />
        </svg>
        <span className="m-patte" />
        <span className="m-patte m-patte-d" />
      </div>

      <div className="m-tube m-tube-2">
        <span className="m-passe">
          <img src="/v4/defi.webp" alt="" width={432} height={768} />
        </span>
      </div>

      <div className="m-tel">
        <div className="m-tel-cadre">
          <div className="m-tel-ecran">
            <Boucle nom="defi" actif={phase === 2} />
          </div>
        </div>
        <div className="m-coeurs">
          {[0, 1, 2, 3].map((i) => (
            <Coeur key={i} i={i} />
          ))}
        </div>
        <Objet nom="pieces-3" className="m-pieces max-lg:hidden" bas />
      </div>
    </div>
    <ol className="sol">
      {["Tu joues", "XPclip monte", "Tu postes"].map((x, i) => (
        <li key={x} className={phase === i ? "actif" : ""}>
          {x}
        </li>
      ))}
    </ol>
    </>
  );
}
