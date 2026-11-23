"use client";
/*
 * Lecteur de la vidéo montée.
 * Vidéo finie par le service de montage (videoChemin) : on lit le vrai MP4 via une URL signée.
 * Sinon (mode simulé) : démo qui enchaîne les clips déposés, avec accroche et filigrane posés par-dessus.
 */
import { useEffect, useRef, useState } from "react";
import { VIDEO } from "@/lib/config";
import type { Video } from "@/lib/etat";
import { chrono } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export function Lecteur({ video, sources }: { video: Video; sources: string[] | null }) {
  if (video.videoChemin) return <LecteurReel chemin={video.videoChemin} duree={video.duree} />;
  return <LecteurDemo video={video} sources={sources} />;
}

/** Le vrai MP4 : accroche, zooms et filigrane sont déjà dans l'image. Son activé au premier appui. */
function LecteurReel({ chemin, duree }: { chemin: string; duree: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [t, setT] = useState(0);
  const [total, setTotal] = useState(duree);

  useEffect(() => {
    let actif = true;
    supabase.storage
      .from("videos")
      .createSignedUrl(chemin, 3600)
      .then(({ data, error }) => {
        if (!actif) return;
        if (error || !data) setErreur(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      actif = false;
    };
  }, [chemin]);

  function basculer() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={basculer}
        disabled={!url}
        className="relative block aspect-[9/16] w-full overflow-hidden rounded-[18px] border-2 border-encre bg-encre text-fond"
        aria-label={lecture ? "Mettre en pause" : "Lire la vidéo"}
      >
        {url && (
          <video
            ref={ref}
            src={`${url}#t=0.1`}
            playsInline
            preload="metadata"
            onPlay={() => setLecture(true)}
            onPause={() => setLecture(false)}
            onEnded={() => setLecture(false)}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
            onError={() => setErreur(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!url && !erreur && <span className="absolute inset-x-0 top-1/2 text-center text-[12px] font-medium text-fond/80">Chargement…</span>}
        {erreur && <span className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[13px] font-medium">Lecture impossible. Recharge la page.</span>}
        {(lecture || t > 0) && (
          <>
            <span className="absolute right-2 top-2 rounded-full bg-encre/70 px-2 py-0.5 text-[10px] font-bold tabular-nums">
              {chrono(t)} / {chrono(total)}
            </span>
            <div className="absolute inset-x-3 bottom-3 h-1 rounded-full bg-fond/30">
              <div className="h-full rounded-full bg-fond" style={{ width: `${Math.min(100, (t / total) * 100)}%` }} />
            </div>
          </>
        )}
        {url && !lecture && (
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-fond">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="#1A0B2E">
                <path d="M7 4.5v15l12-7.5z" />
              </svg>
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

function LecteurDemo({ video, sources }: { video: Video; sources: string[] | null }) {
  const [lecture, setLecture] = useState(false);
  const [t, setT] = useState(0);
  const refVideo = useRef<HTMLVideoElement>(null);
  const segActuel = useRef(-1);

  const n = sources?.length ?? 0;
  const segLen = n ? video.duree / n : 0;
  const demarre = lecture || t > 0;

  // Horloge du montage
  useEffect(() => {
    if (!lecture) return;
    let dernier = performance.now();
    let id = 0;
    const tick = (now: number) => {
      setT((x) => {
        const s = x + (now - dernier) / 1000;
        if (s >= video.duree) {
          setLecture(false);
          return 0;
        }
        return s;
      });
      dernier = now;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [lecture, video.duree]);

  // Enchaînement des clips : chaque clip donne un passage pris en son milieu
  useEffect(() => {
    const v = refVideo.current;
    if (!v || !sources || !n) return;
    const k = Math.min(n - 1, Math.floor(t / segLen));
    if (k !== segActuel.current) {
      segActuel.current = k;
      const d = video.clips[k]?.duree ?? segLen;
      v.src = sources[k];
      v.currentTime = Math.max(0, d / 2 - segLen / 2);
    }
    if (lecture && v.paused) v.play().catch(() => {});
    if (!lecture && !v.paused) v.pause();
  }, [t, lecture, sources, n, segLen, video.clips]);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setLecture((l) => !l)}
        className="relative block aspect-[9/16] w-full overflow-hidden rounded-[18px] border-2 border-encre bg-encre text-fond"
        aria-label={lecture ? "Mettre en pause" : "Lire la vidéo"}
      >
        {sources && n > 0 && <video ref={refVideo} muted playsInline className="absolute inset-0 h-full w-full object-cover" />}

        {!demarre && !sources && <span className="absolute inset-x-0 top-3 text-center text-[11px] font-medium text-fond/80">Aperçu de ta vidéo</span>}
        {demarre && t < VIDEO.accrocheSec && (
          <p className="absolute inset-x-3 top-[16%] rounded-lg border-2 border-encre bg-jaune px-2 py-1.5 text-center text-[12px] font-bold leading-snug text-encre">{video.accroche}</p>
        )}
        {demarre && (
          <span className="absolute right-2 top-2 rounded-full bg-encre/70 px-2 py-0.5 text-[10px] font-bold tabular-nums">
            {chrono(t)} / {chrono(video.duree)}
          </span>
        )}
        {video.filigrane && <span className="absolute inset-x-0 bottom-0 bg-encre/90 py-1.5 text-center text-[10px] font-bold tracking-[0.2em]">XPCLIP</span>}
        {demarre && (
          <div className={`absolute inset-x-3 h-1 rounded-full bg-fond/30 ${video.filigrane ? "bottom-8" : "bottom-3"}`}>
            <div className="h-full rounded-full bg-fond" style={{ width: `${(t / video.duree) * 100}%` }} />
          </div>
        )}
        {!lecture && (
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-fond">
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="#1A0B2E">
                <path d="M7 4.5v15l12-7.5z" />
              </svg>
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
