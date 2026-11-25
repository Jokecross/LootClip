"use client";
/* Une vidéo muette en boucle, qui ne joue que quand elle est à l'écran (et choisie). Sinon l'image reste. */
import { useEffect, useRef } from "react";

export function Boucle({ nom, actif = true, suivante = false, className = "" }: { nom: string; actif?: boolean; /** Passe juste après : elle se charge, sans jouer. */ suivante?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!actif) return v.pause();
    v.currentTime = 0;
    const o = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.2 });
    o.observe(v);
    return () => o.disconnect();
  }, [actif]);
  return <video ref={ref} src={`/v4/${nom}.mp4`} poster={`/v4/${nom}.webp`} muted playsInline loop preload={actif || suivante ? "auto" : "none"} aria-hidden="true" tabIndex={-1} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}
