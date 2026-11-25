"use client";
/* Une vidéo muette en boucle, qui ne joue que quand elle est à l'écran (et choisie). Sinon l'image reste. */
import { useEffect, useRef } from "react";

export function Boucle({ nom, actif = true, reprise = false, className = "" }: { nom: string; actif?: boolean; /** Reprend où elle s'était arrêtée. */ reprise?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!actif) return v.pause();
    if (!reprise) v.currentTime = 0;
    const o = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.2 });
    o.observe(v);
    return () => o.disconnect();
  }, [actif, reprise]);
  return <video ref={ref} src={`/v4/${nom}.mp4`} poster={`/v4/${nom}.webp`} muted playsInline loop preload={actif ? "auto" : "metadata"} aria-hidden="true" tabIndex={-1} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}
