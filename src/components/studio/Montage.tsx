"use client";
/*
 * Le montage mis en scène : les clips du joueur défilent et se coupent dans un cadre 9:16, format flou comme le vrai rendu.
 * La durée est raccourcie (réglage du studio), d'où la mention « Séquence accélérée ».
 */
import { useEffect, useRef, useState } from "react";
import { ETAPES } from "@/lib/montage";
import { bravo, coupe, cran, pop } from "@/lib/sons";

const MORCEAUX = 14;
const COULEURS = ["bg-rose", "bg-jaune", "bg-turquoise", "bg-orange"];

export function Montage({ urls, titre, secondes, fini }: { urls: string[]; titre: string; secondes: number; fini: () => void }) {
  const clips = useRef<(HTMLVideoElement | null)[]>([]);
  const net = useRef<HTMLCanvasElement>(null);
  const flou = useRef<HTMLCanvasElement>(null);
  const eclair = useRef<HTMLSpanElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
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
    clips.current.slice(0, n).forEach((v) => v?.play().catch(() => {}));

    const tic = (t: number) => {
      if (arrete) return;
      const x = Math.min(1, (t - t0) / (secondes * 1000));
      // Les coupes accélèrent vers la fin.
      if (n && t - t0 > prochaine && x < 0.97) {
        prochaine = t - t0 + 620 - x * 430;
        actif = (actif + 1) % n;
        const v = clips.current[actif];
        if (v) {
          const d = v.duration;
          if (Number.isFinite(d) && d > 1) v.currentTime = Math.random() * (d - 0.8);
          if (v.paused) v.play().catch(() => {});
        }
        coupe();
        eclair.current?.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: 160 });
        cadre.current?.animate([{ transform: "scale(1.025) rotate(0.5deg)" }, { transform: "none" }], { duration: 180, easing: "ease-out" });
      }
      const v = clips.current[actif];
      const gn = net.current?.getContext("2d");
      const gf = flou.current?.getContext("2d");
      if (v && v.readyState >= 2 && gn && gf) {
        const L = v.videoWidth;
        const H = v.videoHeight;
        const c = gn.canvas;
        const e = Math.max(c.width / L, c.height / H);
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
    <div className="flex flex-1 flex-col items-center">
      {/* Les clips tournent cachés : seul leur dessin est affiché */}
      <div className="pointer-events-none absolute h-px w-px overflow-hidden opacity-[0.01]" aria-hidden="true">
        {urls.slice(0, 5).map((u, i) => (
          <video key={u} ref={(v) => { clips.current[i] = v; }} src={u} muted playsInline loop autoPlay preload="auto" />
        ))}
      </div>

      <div className="flex w-full items-end justify-between gap-3">
        <p key={etape} className="surgit titre text-[22px] leading-[1.05]">{ETAPES[etape]}</p>
        <p className="titre shrink-0 text-[46px] tabular-nums">{k}&nbsp;%</p>
      </div>

      <div className="relative my-4 flex min-h-0 w-full flex-1 items-center justify-center">
        <div ref={cadre} className="carte-forte relative aspect-[9/16] h-[60dvh] max-h-[640px] min-h-[280px] overflow-hidden bg-encre shadow-[0_6px_0_var(--color-encre)]">
          <canvas ref={flou} width={18} height={32} className="absolute inset-0 h-full w-full scale-125 opacity-80 blur-md" />
          <canvas ref={net} width={640} height={400} className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2" />
          {titre && k > 48 && (
            <span className="surgit absolute inset-x-3 top-[11%] text-center">
              <span className="titre box-decoration-clone rounded-md border-2 border-encre bg-jaune px-2 py-0.5 text-[20px] leading-[1.5]">{titre}</span>
            </span>
          )}
          <span ref={eclair} className="absolute inset-0 bg-blanc opacity-0" />
          <span className="absolute bottom-3 right-3 grid place-items-center">
            {k > 78 && <span className="surgit pastille bg-turquoise">1080 × 1920</span>}
          </span>
        </div>
      </div>

      <div className="carte flex h-11 w-full items-stretch gap-[3px] p-1.5" role="progressbar" aria-valuenow={k} aria-label="Avancement du montage">
        {Array.from({ length: MORCEAUX }, (_, i) =>
          i < poses ? <span key={i} className={`surgit rounded-[5px] border-2 border-encre ${COULEURS[i % 4]}`} style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} /> : <span key={i} className="rounded-[5px] bg-beige" style={{ flex: [2, 1, 3, 1, 2, 2, 1][i % 7] }} />,
        )}
      </div>
      <p className="mt-2 text-[11px] text-encre2">Séquence accélérée</p>
    </div>
  );
}
