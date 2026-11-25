"use client";
/* L'image d'une vidéo montée, chargée quand elle approche de l'écran. Pas encore montée : l'accroche et le robot. */
import { useEffect, useRef, useState } from "react";
import { Robot } from "@/components/accueil/Robot";
import type { Video } from "@/lib/etat";
import { supabase } from "@/lib/supabase";

export function Vignette({ video, avancement, enCours }: { video: Video; avancement: number; enCours: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [vue, setVue] = useState(false);
  const chemin = video.videoChemin;
  useEffect(() => {
    if (!chemin || !ref.current) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        o.disconnect();
        supabase.storage
          .from("videos")
          .createSignedUrl(chemin, 3600)
          .then(({ data }) => data && setUrl(data.signedUrl));
      },
      { rootMargin: "200px" },
    );
    o.observe(ref.current);
    return () => o.disconnect();
  }, [chemin]);
  return (
    <span ref={ref} className="m-tel-ecran" aria-hidden="true">
      {url && <video src={`${url}#t=1`} muted playsInline preload="metadata" tabIndex={-1} onLoadedData={() => setVue(true)} className="absolute inset-0 h-full w-full object-cover" />}
      {!vue && (
        <>
          <span className="etagere-accroche line-clamp-4">{video.accroche || video.titre}</span>
          <Robot xp={chemin ? 1 : avancement} className={enCours ? "travaille" : ""} />
        </>
      )}
    </span>
  );
}
