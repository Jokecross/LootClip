"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const COULEURS = ["#f05fa5", "#f9d477", "#6fe3d6", "#f2934f", "#ffffff"];

/** Pluie de petites vidéos verticales aux couleurs de la marque, contours d'encre. */
export function Confettis() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current!;
    const d = Math.min(2, devicePixelRatio || 1);
    const L = cv.clientWidth;
    const H = cv.clientHeight;
    cv.width = L * d;
    cv.height = H * d;
    const g = cv.getContext("2d")!;
    g.scale(d, d);
    const pieces = Array.from({ length: 90 }, (_, i) => {
      const cote = i % 2 ? 1 : -1;
      return {
        x: L / 2 - cote * L * 0.5,
        y: H * 0.62,
        vx: cote * (120 + Math.random() * 420),
        vy: -(420 + Math.random() * 620),
        a: Math.random() * 6,
        va: (Math.random() - 0.5) * 12,
        t: 7 + Math.random() * 7,
        c: COULEURS[i % COULEURS.length],
      };
    });
    let image = 0;
    let avant = performance.now();
    const t0 = avant;
    const tic = (t: number) => {
      const dt = Math.min(0.032, (t - avant) / 1000);
      avant = t;
      g.clearRect(0, 0, L, H);
      for (const p of pieces) {
        p.vy += 1150 * dt;
        p.vx *= 1 - 0.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.a += p.va * dt;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.a);
        g.scale(Math.cos(p.a * 1.7), 1);
        g.beginPath();
        g.roundRect(-p.t / 2, -p.t * 0.85, p.t, p.t * 1.7, 2.5);
        g.fillStyle = p.c;
        g.fill();
        g.lineWidth = 1.6;
        g.strokeStyle = "#1a0b2e";
        g.stroke();
        g.restore();
      }
      if (t - t0 < 3600) image = requestAnimationFrame(tic);
      else g.clearRect(0, 0, L, H);
    };
    image = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(image);
  }, []);
  // Posés sur la page entière : les confettis passent devant le panneau de droite.
  return createPortal(<canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden="true" />, document.body);
}
