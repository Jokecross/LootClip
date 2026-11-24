"use client";
/*
 * Le fond plein écran : un aplat, des rayons qui tournent, une trame, dessinés par la carte graphique.
 * La couleur suivante s'ouvre en cercle depuis le dernier clic.
 */
import { useEffect, useRef, useState } from "react";
import { clic } from "./store";

export type Couleur = "jaune" | "rose" | "turquoise" | "orange" | "fond" | "nuit2";

const RVB: Record<Couleur, [number, number, number]> = { jaune: [249, 212, 119], rose: [240, 95, 165], turquoise: [111, 227, 214], orange: [242, 147, 79], fond: [253, 245, 234], nuit2: [43, 20, 80] };

const SOMMET = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const PIXEL = `
precision highp float;
uniform vec2 uT; uniform float uA; uniform float uK; uniform vec3 uC; uniform vec3 uD; uniform vec2 uO; uniform float uE;
vec3 teinte(vec3 c, vec2 px) {
  vec2 v = px - vec2(0.68, 0.48) * uT;
  float r = max(length(v), 1.0);
  float a = (atan(v.y, v.x) + uA) * 24.0 / 6.2831853;
  float d = abs(fract(a) - 0.5) - 0.25;
  float bord = 24.0 / (6.2831853 * r) * 0.9;
  vec3 clair = c.r < 0.3 ? c + vec3(0.06, 0.03, 0.10) : mix(c, vec3(1.0), c.g > 0.94 ? 0.5 : 0.24);
  vec3 s = mix(c, clair, smoothstep(-bord, bord, d));
  vec2 g = mod(px, 15.0 * uE) - 7.5 * uE;
  float h = clamp(1.0 - px.y / (uT.y * 0.34), 0.0, 1.0);
  s = mix(s, mix(c, vec3(0.10, 0.04, 0.18), 0.2), (1.0 - smoothstep(1.5 * uE, 2.3 * uE, length(g))) * h * 0.55);
  return s;
}
void main() {
  vec2 px = gl_FragCoord.xy;
  float r = uK * length(uT) * 1.02;
  float d = length(px - uO * uT);
  vec3 c = d < r ? uC : uD;
  vec3 s = teinte(c, px);
  float anneau = 1.0 - smoothstep(3.0 * uE, 4.5 * uE, abs(d - r));
  if (uK > 0.0 && uK < 1.0) s = mix(s, vec3(0.10, 0.04, 0.18), anneau);
  gl_FragColor = vec4(s, 1.0);
}`;

let precedente: Couleur | null = null;
let angle = 0;

export function Decor({ couleur }: { couleur: Couleur }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [depart] = useState(() => precedente ?? couleur);
  const changer = useRef<(c: Couleur) => void>(() => {});

  useEffect(() => {
    const cv = ref.current!;
    const gl = cv.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;
    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, SOMMET], [gl.FRAGMENT_SHADER, PIXEL]] as const) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["uT", "uA", "uK", "uC", "uD", "uO", "uE"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ici = precedente ?? couleur;
    let avant: Couleur | null = null;
    let t0 = 0;
    let o = { x: 0.5, y: 0.5 };
    const taille = () => {
      const e = Math.min(1, devicePixelRatio || 1);
      cv.width = Math.round(cv.clientWidth * e);
      cv.height = Math.round(cv.clientHeight * e);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.uT, cv.width, cv.height);
      gl.uniform1f(u.uE, e);
    };
    changer.current = (c) => {
      precedente = c;
      if (c === ici) return;
      avant = ici;
      ici = c;
      t0 = performance.now();
      o = { x: clic.x, y: 1 - clic.y };
    };
    let image = 0;
    let dernier = performance.now();
    const tic = (t: number) => {
      angle += calme ? 0 : Math.min(50, t - dernier) * 0.00007;
      dernier = t;
      const k = avant ? Math.min(1, (t - t0) / 560) : 1;
      const f = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      if (k >= 1) avant = null;
      const a = RVB[ici];
      const b = RVB[avant ?? ici];
      gl.uniform1f(u.uA, angle);
      gl.uniform1f(u.uK, calme ? 1 : f);
      gl.uniform3f(u.uC, a[0] / 255, a[1] / 255, a[2] / 255);
      gl.uniform3f(u.uD, b[0] / 255, b[1] / 255, b[2] / 255);
      gl.uniform2f(u.uO, o.x, o.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      image = requestAnimationFrame(tic);
    };
    taille();
    const obs = new ResizeObserver(taille);
    obs.observe(cv);
    image = requestAnimationFrame(tic);
    return () => {
      cancelAnimationFrame(image);
      obs.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Le fond est construit une fois par page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => changer.current(couleur), [couleur]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" style={{ background: `var(--color-${depart})` }} aria-hidden="true" />;
}
