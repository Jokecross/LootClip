"use client";
/*
 * L'écran 2 de l'onboarding, pour les débutants : à gauche (ou en haut) la vidéo longue,
 * une flèche, puis les vrais clips sortis du moteur. Une seule vidéo joue : le clip du milieu.
 */
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { DEMO } from "./demo";

export function AvantApres() {
  const [vu, setVu] = useState(false);
  const [devant, setDevant] = useState(0);
  const boite = useRef<HTMLDivElement>(null);
  const clips = DEMO.clips.slice(0, 3);

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.15 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  // Chaque clip joue à son tour
  useEffect(() => {
    if (!vu || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setDevant((d) => (d + 1) % clips.length), 6500);
    return () => clearTimeout(id);
  }, [devant, vu, clips.length]);

  return (
    <div ref={boite} className="aa surgit" aria-hidden="true">
      <div className="aa-avant">
        <p className="aa-etiquette">Avant</p>
        <div className="aa-video">
          <img src={`/v4/${DEMO.avant}.webp`} alt="" width={800} height={450} />
          <span className="aa-plateforme">{DEMO.plateforme}</span>
          <span className="aa-duree">{DEMO.duree}</span>
        </div>
        <p className="aa-legende">Ta vidéo longue, {DEMO.dureeTexte}</p>
      </div>

      <div className="aa-fleche">
        <svg viewBox="0 0 24 24">
          <path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="titre">XPclip</span>
      </div>

      <div className="aa-apres">
        <p className="aa-etiquette aa-etiquette-rose">Après</p>
        <ul className="aa-clips">
          {clips.map((c, i) => (
            <li key={c.nom} data-actif={i === devant}>
              <div className="aa-ecran">
                {i === devant ? <Boucle nom={c.nom} actif={vu} suivante /> : <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} />}
              </div>
              <span className="aa-score">
                <b>{c.score}</b>/100
              </span>
            </li>
          ))}
        </ul>
        <p className="aa-legende">{DEMO.clips.length} clips prêts à poster</p>
      </div>
      {DEMO.chaine && <p className="aa-credit">Vidéo : {DEMO.chaine}</p>}
    </div>
  );
}
