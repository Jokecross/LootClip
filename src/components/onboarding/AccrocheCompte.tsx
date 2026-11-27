"use client";
/*
 * La moitié « envie » des écrans d'inscription et de connexion : le titre, trois vrais clips
 * sortis du moteur (un seul joue à la fois, chacun son tour), et ce qui t'attend.
 */
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { DEMO } from "./demo";

const ATOUTS = ["Tu colles un lien, l'IA fait tout le montage", "Sous-titres mot à mot et accroche écrite", "Prêt pour TikTok, Shorts et Reels"];

export function AccrocheCompte({ mode }: { mode: "inscription" | "connexion" }) {
  const [devant, setDevant] = useState(1);
  const [vu, setVu] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const clips = DEMO.clips.slice(0, 3);
  const inscription = mode === "inscription";

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.15 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vu || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setDevant((d) => (d + 1) % clips.length), 6000);
    return () => clearTimeout(id);
  }, [devant, vu, clips.length]);

  return (
    <div className="ac arrivee">
      <p className="ob-sur">
        <i aria-hidden="true" />
        {inscription ? "Inscription gratuite" : "Bon retour"}
      </p>
      <h1 className="titre ac-titre">
        {inscription ? (
          <>
            Ton premier clip GTA <span className="ac-surligne">t&apos;attend.</span>
          </>
        ) : (
          <>
            Tes clips <span className="ac-surligne">t&apos;attendent.</span>
          </>
        )}
      </h1>
      <p className="ob-sous">{inscription ? "Crée ton compte en 10 secondes. On règle tes clips juste après." : "Connecte-toi et colle ta prochaine vidéo."}</p>

      <div ref={boite} className="ac-clips" aria-hidden="true">
        {clips.map((c, i) => (
          <div key={c.nom} className="ac-clip" data-actif={i === devant} style={{ "--i": i } as React.CSSProperties}>
            <div className="ac-ecran">
              {i === devant ? <Boucle nom={c.nom} actif={vu} suivante /> : <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} />}
            </div>
            <span className="ac-score">
              <b>{c.score}</b>/100
            </span>
          </div>
        ))}
      </div>
      <p className="ac-legende">
        Vrais clips XPclip, tirés d&apos;une vidéo de {DEMO.dureeTexte}
        {DEMO.chaine ? ` de ${DEMO.chaine}` : ""}.
      </p>

      <ul className="ac-atouts">
        {ATOUTS.map((a) => (
          <li key={a}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke="currentColor" strokeWidth="3.400" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}
