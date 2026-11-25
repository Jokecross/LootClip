"use client";
/*
 * Un téléphone qui joue un vrai montage XPclip (public/montages).
 * Sans le son, en boucle, seulement quand il est à l'écran. Si la lecture est bloquée, l'image reste.
 */
import { useEffect, useRef } from "react";
import { Telephone } from "@/components/studio/Telephone";

export const MONTAGES = {
  plage: "Il m'a mal regardé à la plage",
  route: "Je voulais juste rentrer chez moi",
} as const;

export function Montre({ nom, className = "", fixe = false, icones = false }: { nom: keyof typeof MONTAGES; className?: string; /** L'image seule, pour les petites cartes. */ fixe?: boolean; icones?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const o = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.25 });
    o.observe(v);
    return () => o.disconnect();
  }, []);
  return (
    <Telephone className={`pointer-events-none ${className}`}>
      {fixe ? (
        <img src={`/montages/${nom}.jpg`} alt="" width={648} height={1152} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <video ref={ref} src={`/montages/${nom}.mp4`} poster={`/montages/${nom}.jpg`} muted playsInline loop preload="metadata" aria-hidden="true" tabIndex={-1} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className="absolute inset-x-[7%] top-[12%] block text-center">
        <span className="titre inline-block rounded-[0.4em] border-2 border-encre bg-jaune px-[0.5em] py-[0.35em] leading-[1.1] text-encre">{MONTAGES[nom]}</span>
      </span>
      {icones && (
        <span className="absolute bottom-[12%] right-[5%] flex w-[9%] flex-col gap-[14px]" aria-hidden="true">
          {["M12 20S3.5 14.8 3.5 8.9A4.4 4.4 0 0112 7.300a4.400 4.400 0 018.500 1.600C20.500 14.800 12 20 12 20z", "M4 5h16v11H12l-5 4v-4H4z", "M3 11L21 4l-6 17-3.500-7z"].map((d, i) => (
            <svg key={i} viewBox="0 0 24 24" className="w-full" fill={i ? "#fff" : "#F05FA5"} stroke="#1A0B2E" strokeWidth="1.6" strokeLinejoin="round">
              <path d={d} />
            </svg>
          ))}
        </span>
      )}
    </Telephone>
  );
}
