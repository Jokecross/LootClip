"use client";
/*
 * La roue de l'onboarding : on la lance au doigt, elle claque à chaque cran et s'arrête sur une valeur.
 * Dessinée en canvas, avec de l'inertie. Souris, molette, flèches du clavier et toucher d'une case marchent aussi.
 */
import { useEffect, useRef, useState } from "react";
import { arret, cran, reglerSon, reveiller, sonActif } from "@/lib/sons";

const PAS = (16.5 * Math.PI) / 180; // largeur d'une case
const FREIN = 2.3; // plus petit = la roue tourne plus longtemps
const HAUT = 30; // espace au-dessus de la roue, pour l'aiguille
const C = { encre: "#1a0b2e", creme: "#fdf5ea", blanc: "#ffffff", beige: "#ede3d6", cases: ["#f05fa5", "#f9d477", "#6fe3d6", "#f2934f"] };

export function Roulette({
  valeurs,
  valeur,
  libelle,
  changer,
  label,
  elan = true,
  centre,
  nu = false,
  page = false,
}: {
  /** V2 : sans cadre, la roue est posée sur la page et déborde. */
  nu?: boolean;
  /** Posée dans une page qui défile : ni molette, ni blocage du défilement au doigt. */
  page?: boolean;
  valeurs: number[];
  valeur: number;
  libelle: (v: number) => string;
  /** Appelé à chaque cran. */
  changer: (v: number) => void;
  label: string;
  /** La roue se lance toute seule une fois à l'arrivée, pour montrer qu'elle tourne. */
  elan?: boolean;
  /** Sur ordinateur, affiché en grand au milieu de la roue. */
  centre?: React.ReactNode;
}) {
  const moyeu = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const boite = useRef<HTMLDivElement>(null);
  const moteur = useRef<{ aller: (i: number) => void } | null>(null);
  const rappel = useRef({ changer, libelle });
  rappel.current = { changer, libelle };
  const depart = useRef(valeur);
  const [touchee, setTouchee] = useState(false);
  const [son, setSon] = useState(true);
  useEffect(() => setSon(sonActif()), []);

  useEffect(() => {
    const cv = toile.current!;
    const bx = boite.current!;
    const g = cv.getContext("2d")!;
    const n = valeurs.length;
    const police = getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage") || "system-ui";
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const proche = (v: number) => valeurs.reduce((m, x, i) => (Math.abs(x - v) < Math.abs(valeurs[m] - v) ? i : m), 0);

    const fin = proche(depart.current);
    let p = elan && !calme ? Math.max(0, fin - 9) : fin;
    let courant = Math.round(p);
    let cible: number | null = null;
    if (courant !== fin) rappel.current.changer(valeurs[courant]);
    let flap = 0;
    let vFlap = 0;
    let L = 0;
    let H = 0;
    let R = 0;
    let e = 1; // échelle des détails : 1 sur téléphone, plus sur ordinateur
    let image = 0;
    let avant = 0;
    let tient = false;
    let aTourne = false;

    const borne = (x: number) => Math.min(n - 1, Math.max(0, x));

    function passer() {
      const i = borne(Math.round(p));
      if (i === courant) return;
      const sens = Math.sign(i - courant);
      courant = i;
      aTourne = true;
      vFlap = -sens * 14;
      cran(n > 1 ? i / (n - 1) : 0);
      // Petite vibration sur Android (l'iPhone ne le permet pas au web).
      if (tient) navigator.vibrate?.(6);
      rappel.current.changer(valeurs[i]);
    }

    function dessiner() {
      if (!R || image < 0) return;
      const cx = L / 2;
      const cy = HAUT + R;
      g.clearRect(0, 0, L, H);

      // Ombre pleine, comme les boutons
      g.fillStyle = C.encre;
      g.beginPath();
      g.arc(cx, cy + 6, R + 2, 0, Math.PI * 2);
      g.fill();

      const visibles = Math.ceil((Math.PI * (e > 1 ? 1 : 0.62)) / PAS);
      const base = Math.round(p);
      for (let i = base - visibles; i <= base + visibles; i++) {
        const a = (i - p) * PAS - Math.PI / 2;
        const dans = i >= 0 && i < n;
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, R, a - PAS / 2, a + PAS / 2);
        g.closePath();
        g.fillStyle = !dans ? C.beige : nu ? (i === Math.round(p) ? C.cases[0] : i % 2 ? C.blanc : "#fbe6b4") : C.cases[i % C.cases.length];
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = C.encre;
        g.stroke();
        if (dans) {
          const pres = Math.max(0, 1 - Math.abs(i - p));
          g.save();
          g.translate(cx, cy);
          g.rotate(a + Math.PI / 2);
          g.fillStyle = C.encre;
          const texte = rappel.current.libelle(valeurs[i]);
          g.font = `800 ${20 * e}px ${police}`;
          // Les grands montants rétrécissent pour tenir dans leur case.
          const place = Math.min(1, (2 * (R - 60 * e) * Math.sin(PAS / 2) - 14 * e) / g.measureText(texte).width);
          g.font = `800 ${(17.5 + pres * 2.5) * e * place}px ${police}`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(texte, 0, -(R - 48 * e));
          g.restore();
        }
      }

      // Jante
      g.lineWidth = 14 * e;
      g.strokeStyle = C.encre;
      g.beginPath();
      g.arc(cx, cy, R - 7 * e, 0, Math.PI * 2);
      g.stroke();
      for (let i = base - visibles; i <= base + visibles; i++) {
        const a = (i + 0.5 - p) * PAS - Math.PI / 2;
        g.beginPath();
        g.arc(cx + Math.cos(a) * (R - 7 * e), cy + Math.sin(a) * (R - 7 * e), 4 * e, 0, Math.PI * 2);
        g.fillStyle = C.creme;
        g.fill();
      }

      // Moyeu
      const r = R * 0.56;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fillStyle = C.creme;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = C.encre;
      g.stroke();

      // Aiguille
      g.save();
      g.translate(cx, 8);
      g.rotate(flap);
      g.scale(e, e);
      g.beginPath();
      g.moveTo(-15, -2);
      g.quadraticCurveTo(0, -14, 15, -2);
      g.lineTo(0, HAUT + 10);
      g.closePath();
      g.fillStyle = C.blanc;
      g.fill();
      g.lineWidth = 3;
      g.lineJoin = "round";
      g.strokeStyle = C.encre;
      g.stroke();
      g.beginPath();
      g.arc(0, 2, 4, 0, Math.PI * 2);
      g.fillStyle = C.encre;
      g.fill();
      g.restore();
    }

    function boucle(t: number) {
      const dt = Math.min(0.032, (t - avant) / 1000 || 0.016);
      avant = t;
      if (cible !== null && !tient) {
        p += (cible - p) * (1 - Math.exp(-FREIN * dt));
        // Dernier demi-cran : on finit net, sans traîner.
        if (Math.abs(cible - p) < 0.45) p += (cible - p) * (1 - Math.exp(-9 * dt));
        if (Math.abs(cible - p) < 0.004) {
          p = cible;
          cible = null;
          if (aTourne) arret();
          aTourne = false;
        }
      }
      passer();
      vFlap += (-flap * 420 - vFlap * 22) * dt;
      flap = Math.max(-0.5, Math.min(0.5, flap + vFlap * dt));
      dessiner();
      if (cible !== null || tient || Math.abs(flap) > 0.004 || Math.abs(vFlap) > 0.05) image = requestAnimationFrame(boucle);
      else image = 0;
    }
    const lancer = () => {
      if (!image) {
        avant = performance.now();
        image = requestAnimationFrame(boucle);
      }
    };

    function aller(i: number) {
      cible = borne(Math.round(i));
      if (calme) {
        p = cible;
        cible = null;
        passer();
        dessiner();
        return;
      }
      lancer();
    }
    moteur.current = { aller: (i) => aller((cible ?? courant) + i) };

    function taille() {
      L = bx.clientWidth;
      H = bx.clientHeight;
      R = Math.max(290, Math.min(380, L * 0.9));
      e = 1;
      // Ordinateur : la roue remplit le panneau, et le choix s'affiche en son centre.
      if (H > 420 && L > 480) {
        R = Math.max(290, Math.min(L * 0.53, H * 0.78));
        e = Math.min(1.7, Math.max(1.15, R / 340));
        if (moyeu.current) {
          const r = R * 0.56;
          moyeu.current.style.top = `${HAUT + R - r * 0.62}px`;
          moyeu.current.style.height = `${Math.min(r * 1.3, H - 64 - (HAUT + R - r * 0.62))}px`;
        }
      }
      const d = Math.min(nu && L > 480 ? 1.5 : 2, devicePixelRatio || 1);
      cv.width = L * d;
      cv.height = H * d;
      g.setTransform(d, 0, 0, d, 0, 0);
      dessiner();
    }
    const obs = new ResizeObserver(taille);
    obs.observe(bx);
    document.fonts?.ready.then(dessiner);

    /* ---------- Doigt et souris ---------- */
    const angle = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect();
      return Math.atan2(e.clientX - b.left - L / 2, HAUT + R - (e.clientY - b.top));
    };
    let a0 = 0;
    let parcours = 0;
    let trace: { t: number; p: number }[] = [];

    const bas = (e: PointerEvent) => {
      reveiller();
      cv.setPointerCapture(e.pointerId);
      tient = true;
      cible = null;
      parcours = 0;
      a0 = angle(e);
      trace = [{ t: e.timeStamp, p }];
      setTouchee(true);
      lancer();
    };
    const bouge = (e: PointerEvent) => {
      if (!tient) return;
      const a = angle(e);
      let da = a - a0;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      a0 = a;
      parcours += Math.abs(da) * R;
      let dp = -da / PAS;
      // Au bout de la roue, ça résiste.
      if ((p < 0 && dp < 0) || (p > n - 1 && dp > 0)) dp *= 0.25;
      p += dp;
      trace.push({ t: e.timeStamp, p });
      while (trace.length > 2 && e.timeStamp - trace[0].t > 90) trace.shift();
    };
    const haut = (e: PointerEvent) => {
      if (!tient) return;
      reveiller();
      tient = false;
      if (parcours < 6) {
        aller(p + angle(e) / PAS);
        return;
      }
      const f = trace[trace.length - 1];
      const d = trace[0];
      const dt = (f.t - d.t) / 1000;
      const immobile = e.timeStamp - f.t > 80;
      const v = dt > 0.01 && !immobile ? Math.max(-70, Math.min(70, (f.p - d.p) / dt)) : 0;
      aller(p + v / FREIN);
    };
    let molette = 0;
    const roule = (e: WheelEvent) => {
      e.preventDefault();
      reveiller();
      setTouchee(true);
      molette += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const crans = Math.trunc(molette / 30);
      if (!crans) return;
      molette -= crans * 30;
      aller((cible ?? p) + crans);
    };

    cv.addEventListener("pointerdown", bas);
    cv.addEventListener("pointermove", bouge);
    cv.addEventListener("pointerup", haut);
    cv.addEventListener("pointercancel", haut);
    if (!page) cv.addEventListener("wheel", roule, { passive: false });

    const premier = setTimeout(() => {
      if (!tient && cible === null && Math.round(p) !== fin) aller(fin);
    }, 450);

    return () => {
      clearTimeout(premier);
      cancelAnimationFrame(image);
      image = -1;
      obs.disconnect();
      cv.removeEventListener("pointerdown", bas);
      cv.removeEventListener("pointermove", bouge);
      cv.removeEventListener("pointerup", haut);
      cv.removeEventListener("pointercancel", haut);
      cv.removeEventListener("wheel", roule);
    };
    // La roue est construite une fois par écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clavier(e: React.KeyboardEvent) {
    const pas = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5, Home: -1000, End: 1000 } as Record<string, number>)[e.key];
    if (!pas) return;
    e.preventDefault();
    reveiller();
    setTouchee(true);
    moteur.current?.aller(pas);
  }

  return (
    <div
      ref={boite}
      className={nu ? "relative -mx-4 max-h-[330px] min-h-[200px] flex-1 overflow-hidden lg:-m-[clamp(24px,2.6vw,48px)] lg:rounded-[36px] lg:max-h-none lg:min-h-[300px]" : "carte-forte relative max-h-[320px] min-h-[220px] flex-1 overflow-hidden bg-nuit2 lg:max-h-none lg:min-h-[300px] lg:rounded-[32px] lg:shadow-[0_8px_0_var(--color-encre)]"}
    >
      <canvas
        ref={toile}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={valeurs[0]}
        aria-valuemax={valeurs[valeurs.length - 1]}
        aria-valuenow={valeur}
        aria-valuetext={libelle(valeur)}
        onKeyDown={clavier}
        className={`absolute inset-0 h-full w-full cursor-grab ${page ? "touch-pan-y" : "touch-none"} select-none rounded-[14px] lg:rounded-[30px] focus-visible:-outline-offset-4 active:cursor-grabbing`}
      />
      {centre && (
        <div ref={moyeu} className="pointer-events-none absolute inset-x-0 hidden flex-col items-center justify-center lg:flex">
          {centre}
        </div>
      )}
      <span className={`pastille pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 bg-blanc ${nu ? "lg:bottom-6 lg:min-h-10 lg:px-4 lg:text-[15px]" : ""} transition-opacity duration-300 ${touchee ? "opacity-0" : "clignote"}`}>
        Fais tourner la roue
      </span>
      <button
        type="button"
        aria-label={son ? "Couper le son" : "Remettre le son"}
        aria-pressed={!son}
        onClick={() => {
          reglerSon(!son);
          setSon(!son);
        }}
        className={`absolute bottom-0 grid h-12 w-12 place-items-center ${nu ? "right-2 z-20 lg:bottom-6 lg:right-6" : "right-0"}`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-encre bg-blanc">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
            {son ? <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
          </svg>
        </span>
      </button>
    </div>
  );
}
