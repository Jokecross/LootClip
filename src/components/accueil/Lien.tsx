"use client";
/*
 * Le hero : un lien se tape dans le champ, le robot XP travaille, les clips sortent dans les téléphones.
 * Une seule vidéo joue à la fois (deux ensemble font tomber Chrome à 30 images par seconde).
 * Les vidéos sont de vrais montages XPclip des parties de Martin.
 */
import { useEffect, useRef, useState } from "react";
import { Boucle } from "./Boucle";
import { Robot } from "./Robot";
import { SousTitres } from "./SousTitres";

const LIENS = [
  { plateforme: "YouTube", texte: "youtube.com/watch?v=mon-live" },
  { plateforme: "Twitch", texte: "twitch.tv/videos/2210457" },
  { plateforme: "Kick", texte: "kick.com/moi/videos/soiree" },
  { plateforme: "X", texte: "x.com/moi/status/18304" },
];
const CLIPS = [
  { nom: "drole", phrase: "Mon chien conduit mieux que moi" },
  { nom: "defi", phrase: "Il n'aurait pas dû me chercher" },
  { nom: "mission", phrase: "Je voulais juste rentrer chez moi" },
];
// Taper le lien, le robot travaille, les clips jouent
const TEMPS = [2300, 1700, 5200];
const PLACES = ["milieu", "droite", "gauche"];

export function Lien() {
  const [pas, setPas] = useState(0);
  const [lettres, setLettres] = useState(0);
  const [vue, setVue] = useState(true);
  const boite = useRef<HTMLDivElement>(null);
  const phase = pas % 3;
  const tour = Math.floor(pas / 3);
  const lien = LIENS[tour % LIENS.length];
  const devant = tour % CLIPS.length;

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVue(e.isIntersecting), { threshold: 0.1 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vue || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setPas((p) => p + 1), TEMPS[phase]);
    return () => clearTimeout(id);
  }, [phase, pas, vue]);
  // Le lien s'écrit lettre par lettre pendant la première phase
  useEffect(() => {
    if (phase !== 0) return setLettres(lien.texte.length);
    setLettres(0);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setLettres(lien.texte.length);
    const id = setInterval(() => setLettres((l) => (l >= lien.texte.length ? l : l + 1)), 1500 / lien.texte.length);
    return () => clearInterval(id);
  }, [phase, lien]);

  return (
    <>
      <div ref={boite} className="lm" data-phase={phase} aria-hidden="true">
        <div className="lm-champ">
          <span className="lm-pastille">{lien.plateforme}</span>
          <span className="lm-texte">
            <span className="lm-https">https://</span>
            {lien.texte.slice(0, lettres)}
            {phase === 0 && <i className="lm-curseur" />}
          </span>
          <span className="lm-go titre">{phase === 0 ? "Go" : "OK"}</span>
        </div>

        <div className="lm-tube lm-tube-1">
          <span className="lm-passe">
            <span className="lm-puce" />
          </span>
        </div>

        <div className="lm-robot">
          <Robot xp={phase === 0 ? 0.08 : 1} className={phase === 1 ? "lm-travaille" : ""} />
        </div>

        <div className="lm-tube lm-tube-2">
          <span className="lm-passe">
            {CLIPS.map((c) => (
              <img key={c.nom} src={`/v4/clips/${c.nom}.webp`} alt="" width={432} height={768} />
            ))}
          </span>
        </div>

        <div className="lm-tels">
          {CLIPS.map((c, i) => {
            const place = PLACES[(((i - devant) % 3) + 3) % 3];
            const joue = phase === 2 && place === "milieu" && vue;
            return (
              <div key={c.nom} className={`lm-tel lm-${place}`}>
                <div className="m-tel-ecran">
                  <Boucle nom={`clips/${c.nom}`} actif={joue} suivante={place === "milieu"} />
                  {place === "milieu" && <SousTitres phrase={c.phrase} joue={joue} place="bas" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ol className="sol sol-lien">
        {["Tu colles", "XPclip monte", "Tu postes"].map((x, i) => (
          <li key={x} className={phase === i ? "actif" : ""}>
            {x}
          </li>
        ))}
      </ol>
    </>
  );
}
