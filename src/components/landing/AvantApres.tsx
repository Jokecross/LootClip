"use client";
/*
 * Avant / après.
 * Avant : la douleur. Une pile de clips bruts, longs, à l'horizontale, où les bons moments sont rares.
 * Après : un téléphone qui joue la vidéo montée par XPclip, avec ce qui a changé pointé par des étiquettes.
 * Fichiers : public/visuels/brut-1..3.jpg (vignettes) et apres.mp4 / apres.jpg (extrait monté).
 * À REMPLACER par des captures de Martin avant la mise en ligne (les clips actuels viennent d'autres créateurs).
 */
import { useEffect, useRef } from "react";

const CLIPS = [
  { image: "/visuels/brut-1.jpg", duree: "0:53", angle: -4 },
  { image: "/visuels/brut-2.jpg", duree: "0:39", angle: 3 },
  { image: "/visuels/brut-3.jpg", duree: "0:12", angle: -2 },
];

// Frise du jeu brut : les rares bons moments, en jaune. Positions en % de la durée totale.
const BONS_MOMENTS = [
  { debut: 4, largeur: 5 },
  { debut: 23, largeur: 7 },
  { debut: 47, largeur: 4 },
  { debut: 61, largeur: 8 },
  { debut: 88, largeur: 5 },
];

function VideoEnBoucle() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !reduit) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src="/visuels/apres.mp4"
      poster="/visuels/apres.jpg"
      muted
      loop
      playsInline
      preload="none"
      aria-label="La vidéo montée par XPclip : accroche, zooms et meilleurs passages, en vertical"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function Etiquette({ children, fond, className }: { children: React.ReactNode; fond: string; className: string }) {
  return <span className={`pastille absolute z-10 px-3 py-1 text-[12px] text-encre shadow-[0_3px_0_var(--color-encre)] ${fond} ${className}`}>{children}</span>;
}

export function AvantApres() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-12">
      {/* Avant */}
      <div>
        <p className="text-[14px] font-bold">Avant</p>
        <p className="titre mt-1 text-[26px] text-fond lg:text-[34px]">Des minutes de jeu brut.</p>
        <div className="relative mt-6 aspect-[2/1] lg:mt-10">
          {CLIPS.map((c, i) => (
            <div
              key={c.image}
              className="absolute w-[62%] overflow-hidden rounded-xl border-2 border-fond/70 bg-encre shadow-[0_4px_0_rgb(0_0_0/0.5)]"
              style={{ left: `${i * 18}%`, top: `${i * 13}%`, transform: `rotate(${c.angle}deg)`, zIndex: 3 - i }}
            >
              <img src={c.image} alt="" className="block aspect-video w-full object-cover opacity-60 grayscale-[0.5]" loading="lazy" />
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-encre/85 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-fond">{c.duree}</span>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-fond/60 bg-fond/15" aria-hidden="true">
            {BONS_MOMENTS.map((m) => (
              <span key={m.debut} className="absolute inset-y-0 bg-jaune" style={{ left: `${m.debut}%`, width: `${m.largeur}%` }} />
            ))}
          </div>
          <p className="mt-2 text-[13px] text-fond/70 lg:text-[15px]">
            En jaune, les vrais bons moments. Le reste, personne ne le regarde.
          </p>
        </div>
      </div>

      {/* Flèche */}
      <div className="flex justify-center" aria-hidden="true">
        <span className="pastille rotate-[-4deg] bg-rose px-4 py-1.5 text-[14px] text-encre shadow-[0_3px_0_var(--color-fond)] lg:px-5 lg:py-2.5 lg:text-[18px]">
          XPclip <span className="lg:hidden">↓</span>
          <span className="hidden lg:inline">→</span>
        </span>
      </div>

      {/* Après */}
      <div>
        <p className="text-[14px] font-bold text-jaune">Après</p>
        <p className="titre mt-1 text-[26px] text-fond lg:text-[34px]">30 secondes qui accrochent.</p>
        <div className="relative mx-auto mt-8 w-[230px] pb-2 lg:mt-10 lg:w-[270px]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[26px] border-[3px] border-fond bg-nuit2 shadow-[0_8px_0_rgb(0_0_0/0.5)]">
            <VideoEnBoucle />
          </div>
          <Etiquette fond="bg-jaune" className="-left-10 -top-3 -rotate-6">
            Accroche dès la 1re seconde
          </Etiquette>
          <Etiquette fond="bg-turquoise" className="-right-14 top-[42%] rotate-3">
            Que les meilleurs moments
          </Etiquette>
          <Etiquette fond="bg-blanc" className="-left-10 top-[66%] -rotate-3">
            Zooms et coupes rythmées
          </Etiquette>
          <Etiquette fond="bg-rose" className="-right-8 bottom-[6%] rotate-2">
            Prête à poster
          </Etiquette>
        </div>
      </div>
    </div>
  );
}
