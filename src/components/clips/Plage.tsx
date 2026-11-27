"use client";
/*
 * Le passage analysé : la vidéo (lecteur YouTube officiel quand c'est YouTube), sa durée totale,
 * et deux curseurs pour choisir de où à où, 20 minutes au plus.
 * Durée : lecteur YouTube (dans le navigateur), métadonnées du fichier, ou aperçu serveur (Twitch, Kick, X).
 */
import { useEffect, useRef, useState } from "react";
import { PLAGE_MAX } from "@/lib/clips-options";

type Plage = { debut: number; fin: number };

export const idYoutube = (lien: string) => lien.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/)?.[1] ?? null;

const hms = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
};

type LecteurYT = { getDuration: () => number; destroy: () => void; seekTo: (s: number, a: boolean) => void };
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, o: Record<string, unknown>) => LecteurYT };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Charge l'API du lecteur YouTube une seule fois. */
let api: Promise<void> | null = null;
function chargerApi() {
  if (window.YT?.Player) return Promise.resolve();
  api ??= new Promise((ok) => {
    const avant = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      avant?.();
      ok();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return api;
}

export function ChoixPlage({ lien, dureeConnue, plage, changer }: { lien: string; /** Fichier ou aperçu serveur. */ dureeConnue: number | null; plage: Plage; changer: (p: Plage) => void }) {
  const yt = idYoutube(lien);
  const boite = useRef<HTMLDivElement>(null);
  const lecteur = useRef<LecteurYT | null>(null);
  const [dureeYt, setDureeYt] = useState<number | null>(null);
  const duree = dureeYt ?? dureeConnue;

  // Le lecteur YouTube officiel : on lit la durée quand il est prêt.
  useEffect(() => {
    if (!yt || !boite.current) return;
    let fini = false;
    const el = document.createElement("div");
    boite.current.replaceChildren(el);
    chargerApi().then(() => {
      if (fini || !window.YT) return;
      lecteur.current = new window.YT.Player(el, {
        videoId: yt,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: (e: { target: LecteurYT }) => !fini && setDureeYt(Math.floor(e.target.getDuration()) || null) },
      });
    });
    return () => {
      fini = true;
      lecteur.current?.destroy();
      lecteur.current = null;
    };
  }, [yt]);

  // Durée connue : la plage par défaut tient dans la vidéo.
  useEffect(() => {
    if (!duree) return;
    if (plage.fin > duree || plage.debut >= duree) changer({ debut: 0, fin: Math.min(duree, PLAGE_MAX) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duree]);

  const max = duree ?? Math.max(plage.fin, PLAGE_MAX);
  const bouger = (quoi: "debut" | "fin", v: number) => {
    let { debut, fin } = plage;
    if (quoi === "debut") {
      debut = Math.min(v, fin - 10);
      if (fin - debut > PLAGE_MAX) fin = debut + PLAGE_MAX;
    } else {
      fin = Math.max(v, debut + 10);
      if (fin - debut > PLAGE_MAX) debut = fin - PLAGE_MAX;
    }
    changer({ debut: Math.max(0, debut), fin: Math.min(max, fin) });
    lecteur.current?.seekTo(quoi === "debut" ? debut : fin, true);
  };
  const longueur = plage.fin - plage.debut;
  const gauche = (plage.debut / max) * 100;
  const largeur = (longueur / max) * 100;

  return (
    <div className="ap-carte ap-plage">
      {yt && <div ref={boite} className="ap-plage-video" />}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-extrabold">Passage analysé</p>
        <p className="text-[13px] font-semibold text-encre2">{duree ? `Vidéo de ${hms(duree)}` : "Durée inconnue"} · 20 min max</p>
      </div>
      {duree || !yt ? (
        <>
          <div className="ap-plage-piste">
            <span className="ap-plage-rempli" style={{ left: `${gauche}%`, width: `${largeur}%` }} />
            <input type="range" min={0} max={max} step={1} value={plage.debut} onChange={(e) => bouger("debut", Number(e.target.value))} aria-label="Début du passage" />
            <input type="range" min={0} max={max} step={1} value={plage.fin} onChange={(e) => bouger("fin", Number(e.target.value))} aria-label="Fin du passage" />
          </div>
          <div className="flex items-center justify-between text-[14px] font-extrabold tabular-nums">
            <span className="ap-plage-temps">{hms(plage.debut)}</span>
            <span className="text-[12px] font-semibold text-encre2">{Math.round(longueur / 60)} min analysées</span>
            <span className="ap-plage-temps">{hms(plage.fin)}</span>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-encre2">Chargement de la vidéo…</p>
      )}
    </div>
  );
}
