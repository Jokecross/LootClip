"use client";
/*
 * Le premier écran de l'onboarding : une petite interface XPclip qui tourne en boucle.
 * Un lien s'écrit, l'IA note trois moments, trois clips 9:16 sortent. Une seule vidéo joue à la fois.
 * Vrais clips sortis du moteur à partir de la vidéo de démo (voir demo.ts).
 */
import { useEffect, useRef, useState } from "react";
import { Boucle } from "@/components/accueil/Boucle";
import { SousTitres } from "@/components/accueil/SousTitres";
import { DEMO } from "./demo";

const LIEN = DEMO.lien;
const CLIPS = DEMO.clips.slice(0, 3);
const TEMPS = [2200, 2200, 6400];
const PISTE = Array.from({ length: 44 }, (_, i) => 22 + ((i * 41 + (i % 7) * 13) % 70));

export function Vitrine() {
  const [pas, setPas] = useState(0);
  const [lettres, setLettres] = useState(0);
  const [vue, setVue] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const phase = pas % 3;

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVue(e.isIntersecting), { threshold: 0.15 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vue) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setPas(2);
    const id = setTimeout(() => setPas((p) => p + 1), TEMPS[phase]);
    return () => clearTimeout(id);
  }, [pas, phase, vue]);
  useEffect(() => {
    if (phase !== 0) return setLettres(LIEN.length);
    setLettres(0);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setLettres(LIEN.length);
    const id = setInterval(() => setLettres((l) => Math.min(LIEN.length, l + 1)), 1300 / LIEN.length);
    return () => clearInterval(id);
  }, [phase, pas]);

  return (
    <div ref={boite} className="vit" data-phase={phase} aria-hidden="true">
      <div className="vit-barre">
        <span className="vit-points">
          <i />
          <i />
          <i />
        </span>
        <span className="vit-statut">{phase === 2 ? "3 clips prêts" : phase === 1 ? "3 moments trouvés" : "Lien collé"}</span>
      </div>
      <div className="vit-corps">
        <div className="vit-champ">
          <span className="vit-plateforme">{DEMO.plateforme}</span>
          <span className="vit-lien">
            {LIEN.slice(0, lettres)}
            {phase === 0 && <i className="vit-curseur" />}
          </span>
          <span className="vit-go">{phase === 0 ? "Go" : "OK"}</span>
        </div>
        <div className="vit-frise">
          {PISTE.map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
          {CLIPS.map((c, i) => (
            <b key={c.nom} style={{ left: `${c.debut}%`, width: `${c.largeur}%`, "--i": i } as React.CSSProperties}>
              <span>{c.score}</span>
            </b>
          ))}
        </div>
        <ul className="vit-clips">
          {CLIPS.map((c, i) => {
            const joue = phase === 2 && i === 1 && vue;
            return (
              <li key={c.nom} style={{ "--i": i } as React.CSSProperties} data-milieu={i === 1}>
                <div className="vit-ecran">
                  {i === 1 ? (
                    <>
                      <Boucle nom={c.nom} actif={joue} suivante />
                      {DEMO.sousTitresDessines && <SousTitres phrase={c.titre} joue={joue} place="bas" />}
                    </>
                  ) : (
                    <img src={`/v4/${c.nom}.webp`} alt="" width={432} height={768} />
                  )}
                </div>
                <span className="vit-score">
                  <b>{c.score}</b>/100
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
