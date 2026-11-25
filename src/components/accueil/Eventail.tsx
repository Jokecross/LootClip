"use client";
/*
 * Le début du parcours : trois vidéos montées en éventail, le robot devant.
 * Celle du milieu joue, puis l'éventail tourne. Une seule vidéo à la fois.
 */
import { useEffect, useRef, useState } from "react";
import { Objet } from "@/components/objets/Objet";
import { Boucle } from "./Boucle";
import { Robot } from "./Robot";

const CLIPS = ["drole", "defi", "mission"];
const PLACES = ["milieu", "droite", "gauche"];

export function Eventail() {
  const [tour, setTour] = useState(0);
  const [vu, setVu] = useState(true);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.1 });
    o.observe(boite.current!);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    if (!vu || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setTour((t) => t + 1), 5200);
    return () => clearTimeout(id);
  }, [tour, vu]);
  return (
    <div ref={boite} className="eventail" aria-hidden="true">
      {CLIPS.map((c, i) => {
        const place = PLACES[(((i - tour) % 3) + 3) % 3];
        return (
          <div key={c} className={`ev-tel ev-${place}`}>
            <div className="m-tel-ecran">
              <Boucle nom={`clips/${c}`} actif={place === "milieu" && vu} suivante={place === "droite"} />
            </div>
          </div>
        );
      })}
      <Robot xp={0.1} className="ev-robot saute" />
      <Objet nom="manette" className="ev-manette" />
      <Objet nom="pieces-3" className="max-lg:hidden ev-pieces ev-pieces-g" bas />
      <Objet nom="pieces-4" className="max-lg:hidden ev-pieces ev-pieces-d" bas />
    </div>
  );
}
