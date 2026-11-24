"use client";
import { useEffect, useState } from "react";

/** Un lecteur vidéo caché, dont l'image sert d'écran au téléphone 3D. */
export function useLecteur(url: string, son = false) {
  const [v, setV] = useState<HTMLVideoElement | null>(null);
  const [muet, setMuet] = useState(true);
  useEffect(() => {
    if (!url) return;
    const el = document.createElement("video");
    Object.assign(el, { src: url, loop: true, playsInline: true, preload: "auto", muted: !son });
    // Dans la page, mais invisible : Safari met en pause une vidéo qui n'y est pas.
    el.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none";
    document.body.appendChild(el);
    el.play()
      .then(() => setMuet(el.muted))
      .catch(() => {
        el.muted = true;
        setMuet(true);
        el.play().catch(() => {});
      });
    setV(el);
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.load();
      el.remove();
      setV(null);
    };
  }, [url, son]);
  return {
    video: v,
    muet,
    basculer: () => {
      if (!v) return;
      v.muted = !v.muted;
      setMuet(v.muted);
      v.play().catch(() => {});
    },
  };
}
