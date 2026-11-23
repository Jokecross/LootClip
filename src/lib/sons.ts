"use client";
/*
 * Petits sons de l'onboarding, fabriqués dans le navigateur (aucun fichier à charger).
 * Le téléphone n'autorise le son qu'après un premier toucher : `reveiller` est appelé à chaque toucher.
 * Sur iPhone, le bouton silencieux coupe aussi ces sons.
 */
const CLE = "xpclip:son";
let ctx: AudioContext | null = null;
let bruit: AudioBuffer | null = null;
let sortie: AudioNode | null = null;
let dernier = 0;

export function sonActif() {
  try {
    return localStorage.getItem(CLE) !== "non";
  } catch {
    return true;
  }
}

export function reglerSon(oui: boolean) {
  try {
    localStorage.setItem(CLE, oui ? "oui" : "non");
  } catch {}
}

export function reveiller() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: "interactive" });
    const n = Math.floor(ctx.sampleRate * 0.05);
    bruit = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = bruit.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    // Compresseur : les crans rapprochés ne saturent pas.
    const c = ctx.createDynamicsCompressor();
    c.connect(ctx.destination);
    sortie = c;
  }
  if (ctx.state !== "running") ctx.resume().catch(() => {});
}

const pret = () => ctx && sortie && ctx.state === "running" && sonActif();

function note(frequence: number, debut: number, duree: number, volume: number, forme: OscillatorType) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = forme;
  o.frequency.setValueAtTime(frequence, debut);
  g.gain.setValueAtTime(volume, debut);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  o.connect(g).connect(sortie!);
  o.start(debut);
  o.stop(debut + duree + 0.01);
}

/** Un cran de roue : claquement sec, un peu plus aigu quand la valeur monte (`hauteur` de 0 à 1). */
export function cran(hauteur: number) {
  if (!pret()) return;
  const t = ctx!.currentTime;
  if (t - dernier < 0.018) return;
  dernier = t;
  const s = ctx!.createBufferSource();
  const f = ctx!.createBiquadFilter();
  const g = ctx!.createGain();
  s.buffer = bruit;
  f.type = "bandpass";
  f.frequency.value = 2600 + hauteur * 1400;
  f.Q.value = 2.2;
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  s.connect(f).connect(g).connect(sortie!);
  s.start(t);
  s.stop(t + 0.04);
  note(620 + hauteur * 520, t, 0.035, 0.22, "triangle");
}

/** La roue s'arrête. */
export function arret() {
  if (!pret()) return;
  const t = ctx!.currentTime;
  note(784, t, 0.16, 0.2, "triangle");
  note(1175, t + 0.07, 0.24, 0.2, "triangle");
}

/** Le plan est prêt : trois notes qui montent. */
export function bravo() {
  if (!pret()) return;
  const t = ctx!.currentTime;
  [784, 988, 1175, 1568].forEach((f, i) => note(f, t + i * 0.08, 0.32, 0.18, "triangle"));
}
