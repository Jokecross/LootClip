"use client";
/*
 * Le montage mis en scène : les clips du joueur défilent et se coupent dans un cadre 9:16, image entière sur fond flouté comme le vrai rendu.
 * La durée est raccourcie (réglage du studio), d'où la mention « Séquence accélérée ».
 */
import { useEffect, useRef, useState } from "react";
import { Telephone } from "@/components/studio/Telephone";
import { Duo, Titre } from "@/components/ui/Duo";
import { Coche } from "@/components/ui/Parcours";
import { ETAPES } from "@/lib/montage";
import { bravo, coupe, cran, pop } from "@/lib/sons";

const MORCEAUX = 14;
const COULEURS = ["bg-rose", "bg-jaune", "bg-turquoise", "bg-orange"];

export function Montage({ entete, urls, titre, secondes, fini }: { entete: React.ReactNode; urls: string[]; titre: string; secondes: number; fini: () => void }) {
  const clips = useRef<(HTMLVideoElement | null)[]>([]);
  const net = useRef<HTMLCanvasElement>(null);
  const flou = useRef<HTMLCanvasElement>(null);
  const [k, setK] = useState(0);
  const fin = useRef(fini);
  fin.current = fini;

  useEffect(() => {
    const t0 = performance.now();
    let image = 0;
    let arrete = false;
    let actif = 0;
    let prochaine = 0;
    let morceau = 0;
    let dernierK = -1;
    const n = Math.min(urls.length, 5);
    const caler = (i: number) => {
      const v = clips.current[i];
      if (!v || (n > 1 && i === actif)) return;
      const d = v.duration;
      if (Number.isFinite(d) && d > 1) v.currentTime = Math.random() * (d - 0.8);
    };
    clips.current[0]?.play().catch(() => {});
    caler(1 % Math.max(1, n));

    const tic = (t: number) => {
      if (arrete) return;
      const x = Math.min(1, (t - t0) / (secondes * 1000));
      // Les coupes accélèrent vers la fin.
      if (n && t - t0 > prochaine && x < 0.97) {
        prochaine = t - t0 + 620 - x * 430;
        // Une seule vidéo tourne à la fois. La suivante a déjà été calée au bon endroit, à l'arrêt.
        clips.current[actif]?.pause();
        actif = (actif + 1) % n;
        clips.current[actif]?.play().catch(() => {});
        caler((actif + 1) % n);
        coupe();
      }
      const v = clips.current[actif];
      const gn = net.current?.getContext("2d");
      const gf = flou.current?.getContext("2d");
      if (v && v.readyState >= 2 && gn && gf) {
        const L = v.videoWidth;
        const H = v.videoHeight;
        const c = gn.canvas;
        const e = Math.min(c.width / L, c.height / H);
        gn.clearRect(0, 0, c.width, c.height);
        gn.drawImage(v, (c.width - L * e) / 2, (c.height - H * e) / 2, L * e, H * e);
        const f = gf.canvas;
        const b = Math.max(f.width / L, f.height / H);
        gf.drawImage(v, (f.width - L * b) / 2, (f.height - H * b) / 2, L * b, H * b);
      }
      const m = Math.min(MORCEAUX, Math.floor(x * MORCEAUX * 1.02));
      if (m !== morceau) {
        morceau = m;
        pop(m / MORCEAUX);
      }
      const p = Math.round(x * 100);
      if (p !== dernierK) {
        dernierK = p;
        if (p % 2) cran(x);
        setK(p);
      }
      if (x < 1) image = requestAnimationFrame(tic);
      else {
        bravo();
        setTimeout(() => !arrete && fin.current(), 450);
      }
    };
    image = requestAnimationFrame(tic);
    return () => {
      arrete = true;
      cancelAnimationFrame(image);
    };
  }, [urls, secondes]);

  const etape = Math.min(ETAPES.length - 1, Math.floor((k / 100) * ETAPES.length));
  const poses = Math.min(MORCEAUX, Math.floor((k / 100) * MORCEAUX * 1.02));

  return (
    <Duo
      cle="montage"
      entete={entete}
      fond="orange"
      large
      gauche={
        <>
          {/* Les clips tournent cachés : seul leur dessin est affiché */}
          <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-[0.01]" aria-hidden="true">
            {urls.slice(0, 5).map((u, i) => (
              <video key={u} ref={(v) => { clips.current[i] = v; }} src={u} muted playsInline loop preload="auto" />
            ))}
          </div>

          <Titre
            travaille={k < 100}
            fete={k >= 100}
            xp={k / 100}
            sous={<span key={etape} className="arrivee block font-bold text-encre">{ETAPES[etape]}</span>}
            plus={
              <ol className="mt-5 hidden flex-col gap-3 lg:flex">
                {ETAPES.map((e, i) => (
                  <li key={e} className={`flex items-center gap-3.5 text-[clamp(16px,1.3vw,21px)] font-bold transition-opacity duration-300 ${i > etape ? "opacity-35" : ""}`}>
                    {i < etape || k === 100 ? <Coche className="h-7 w-7 shrink-0" /> : <span className={`h-7 w-7 shrink-0 rounded-full border-2 border-encre ${i === etape ? "clignote bg-rose" : ""}`} />}
                    {e}
                  </li>
                ))}
              </ol>
            }
          >
            <span className="block text-[1.7em] tabular-nums leading-[0.9]">{k}&nbsp;%</span>
          </Titre>
        </>
      }
      droite={
        <>
          <div className="relative min-h-[260px] w-full flex-1 lg:min-h-0">
            <Telephone className="absolute inset-0">
              <canvas ref={flou} width={18} height={32} className="absolute inset-0 h-full w-full scale-125 opacity-80" />
              <canvas ref={net} width={540} height={960} className="absolute inset-0 h-full w-full" />
              {titre && k > 48 && (
                <span className="surgit absolute inset-x-3 top-[11%] text-center">
                  <span className="titre box-decoration-clone rounded-md border-2 border-encre bg-jaune px-2 py-0.5 text-[18px] leading-[1.5] lg:text-[28px]">{titre}</span>
                </span>
              )}
            </Telephone>
            {k > 78 && <span className="surgit pastille absolute bottom-[8%] right-[6%] z-20 bg-turquoise lg:min-h-12 lg:px-5 lg:text-[20px]">1080 × 1920</span>}
          </div>

          <div className="relative mt-3 lg:mt-[min(24px,3vh)]">
            {/* Le tapis : les clips passent par le robot et tombent dans la frise */}
            <span className="convoyeur" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <i key={i} className={COULEURS[i % 4]} style={{ "--i": i } as React.CSSProperties} />
              ))}
            </span>
          <div className="bloc relative z-20 flex h-14 w-full items-stretch gap-[3px] !rounded-[18px] bg-blanc p-1.5 lg:h-[min(88px,10vh)] lg:gap-1.5 lg:!rounded-[24px] lg:p-2.5" role="progressbar" aria-valuenow={k} aria-label="Avancement du montage">
            {Array.from({ length: MORCEAUX }, (_, i) =>
              i < poses ? <span key={i} className={`surgit rounded-[5px] border-2 border-encre lg:rounded-lg ${COULEURS[i % 4]}`} style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} /> : <span key={i} className="rounded-[5px] bg-beige lg:rounded-lg" style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} />,
            )}
          </div>
          </div>
          <p className="mt-4 text-center text-[12px] font-bold lg:text-[15px]">Séquence accélérée</p>
        </>
      }
    />
  );
}
