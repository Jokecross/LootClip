/*
 * Ce qui s'affiche sur l'écran des téléphones et sur les clips. Tout est dessiné par nous :
 * une route de bord de mer inventée, aucun visuel d'un jeu existant.
 */
export const C = { fond: "#fdf5ea", blanc: "#ffffff", encre: "#1a0b2e", beige: "#ede3d6", rose: "#f05fa5", orange: "#f2934f", jaune: "#f9d477", turquoise: "#6fe3d6", nuit: "#2b1450" };
type G = CanvasRenderingContext2D;

const TAU = Math.PI * 2;

function palmier(g: G, x: number, y: number, h: number, sens: number) {
  g.strokeStyle = C.encre;
  g.lineCap = "round";
  g.lineWidth = h * 0.07;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + sens * h * 0.05, y - h * 0.5, x + sens * h * 0.16, y - h);
  g.stroke();
  g.lineWidth = h * 0.055;
  for (const [dx, dy] of [[-0.4, 0.04], [-0.34, -0.18], [-0.06, -0.3], [0.26, -0.22], [0.42, 0], [0.3, 0.16]]) {
    g.beginPath();
    g.moveTo(x + sens * h * 0.16, y - h);
    g.quadraticCurveTo(x + sens * h * (0.16 + dx * 0.5), y - h + h * (dy - 0.16), x + sens * h * (0.16 + dx), y - h + h * (dy + 0.14));
    g.stroke();
  }
}

function ciel(g: G, w: number, h: number, horizon: number, x: number) {
  const bandes = [C.nuit, "#7a2a86", C.rose, C.orange, C.jaune];
  bandes.forEach((c, i) => {
    g.fillStyle = c;
    g.fillRect(0, (horizon * i) / bandes.length, w, horizon / bandes.length + 1);
  });
  const r = h * 0.27;
  g.fillStyle = C.fond;
  g.beginPath();
  g.arc(x, horizon, r, Math.PI, 0);
  g.fill();
  g.fillStyle = C.orange;
  for (let i = 0; i < 4; i++) g.fillRect(x - r, horizon - r * 0.14 - i * r * 0.2, r * 2, r * (0.085 - i * 0.015));
}

function ville(g: G, w: number, horizon: number, h: number, d: number) {
  g.fillStyle = C.encre;
  const l = w / 13;
  for (let i = -1; i < 15; i++) {
    const n = Math.abs(Math.sin((i + Math.floor(d / l)) * 12.9898) * 43758.5) % 1;
    const bh = h * (0.06 + n * 0.17);
    g.fillRect(i * l - (d % l), horizon - bh, l * (0.62 + n * 0.3), bh);
  }
}

function voiture(g: G, x: number, y: number, e: number, couleur: string) {
  g.save();
  g.translate(x, y);
  g.scale(e, e);
  g.lineJoin = "round";
  g.lineWidth = 5;
  g.strokeStyle = C.encre;
  g.fillStyle = C.encre;
  g.fillRect(-46, -8, 22, 22);
  g.fillRect(24, -8, 22, 22);
  g.fillStyle = couleur;
  g.beginPath();
  g.moveTo(-52, 2);
  g.lineTo(-54, -26);
  g.quadraticCurveTo(-52, -38, -38, -40);
  g.lineTo(-27, -64);
  g.lineTo(27, -64);
  g.lineTo(38, -40);
  g.quadraticCurveTo(52, -38, 54, -26);
  g.lineTo(52, 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = C.nuit;
  g.beginPath();
  g.moveTo(-26, -42);
  g.lineTo(-20, -57);
  g.lineTo(20, -57);
  g.lineTo(26, -42);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = C.rose;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.roundRect(s * 38 - 11, -30, 22, 10, 4);
    g.fill();
    g.stroke();
  }
  g.restore();
}

function route(g: G, w: number, h: number, t: number) {
  const hz = h * 0.48;
  ciel(g, w, h, hz, w * 0.52 + Math.sin(t * 0.6) * w * 0.05);
  ville(g, w, hz, h, t * 6);
  g.fillStyle = C.turquoise;
  g.fillRect(0, hz, w, h - hz);
  g.fillStyle = "#4a2a75";
  g.beginPath();
  const k = Math.sin(t * 0.7) * w * 0.05;
  g.moveTo(w * 0.48 + k, hz);
  g.lineTo(w * 0.55 + k, hz);
  g.lineTo(w * 1.05, h);
  g.lineTo(-w * 0.05, h);
  g.closePath();
  g.fill();
  g.fillStyle = C.jaune;
  for (let i = 0; i < 7; i++) {
    const p = ((i / 7 + t * 0.9) % 1) ** 2.4;
    const y = hz + p * (h - hz);
    const l = 1 + p * w * 0.035;
    g.fillRect(w * 0.515 + k * (1 - p) - l / 2, y, l, 2 + p * h * 0.12);
  }
  for (let i = 0; i < 5; i++) {
    const p = ((i / 5 + t * 0.45) % 1) ** 2.2;
    for (const s of [-1, 1]) palmier(g, w * 0.515 + k * (1 - p) + s * (w * 0.06 + p * w * 0.62), hz + p * h * 0.4, h * (0.06 + p * 0.75), s);
  }
  voiture(g, w * 0.5 + Math.sin(t * 2.1) * w * 0.035, h * 0.93 + Math.sin(t * 19) * 1.2, h * 0.0048, C.rose);
}

function saut(g: G, w: number, h: number, t: number) {
  const hz = h * 0.78;
  ciel(g, w, h, hz, w * 0.68);
  ville(g, w, hz, h * 1.2, t * 46);
  g.fillStyle = C.encre;
  g.fillRect(0, hz, w, h);
  g.fillStyle = C.jaune;
  for (let i = -1; i < 7; i++) g.fillRect((i * w) / 6 - ((t * w * 0.9) % (w / 6)), h * 0.88, w / 12, h * 0.025);
  const p = (t * 0.55) % 1;
  const y = hz - Math.sin(p * Math.PI) * h * 0.46;
  g.save();
  g.translate(w * (0.22 + p * 0.46), y);
  g.rotate(-0.5 + p * 0.95);
  g.lineWidth = h * 0.02;
  g.strokeStyle = C.encre;
  g.fillStyle = C.turquoise;
  g.beginPath();
  const u = h * 0.01;
  g.moveTo(-26 * u, 0);
  g.lineTo(-26 * u, -9 * u);
  g.lineTo(-13 * u, -11 * u);
  g.lineTo(-6 * u, -19 * u);
  g.lineTo(9 * u, -19 * u);
  g.lineTo(17 * u, -11 * u);
  g.lineTo(27 * u, -8 * u);
  g.lineTo(27 * u, 0);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = C.encre;
  for (const x of [-15, 16]) {
    g.beginPath();
    g.arc(x * u, 0, 6 * u, 0, TAU);
    g.fill();
  }
  g.restore();
  palmier(g, w * 1.2 - ((t * w * 0.8) % (w * 1.5)), hz, h * 0.6, 1);
}

function dessus(g: G, w: number, h: number, t: number) {
  g.fillStyle = C.turquoise;
  g.fillRect(0, 0, w, h);
  g.fillStyle = C.jaune;
  g.fillRect(0, 0, w, h * 0.2);
  g.fillStyle = "#4a2a75";
  g.fillRect(0, h * 0.28, w, h * 0.5);
  g.fillStyle = C.fond;
  for (let i = -1; i < 7; i++) g.fillRect((i * w) / 6 - ((t * w * 0.75) % (w / 6)), h * 0.515, w / 11, h * 0.03);
  const autos: [number, number, string][] = [[0.15, 0.4, C.orange], [0.6, 0.64, C.jaune], [0.95, 0.4, C.blanc]];
  for (const [x0, y, c] of autos) auto(g, ((x0 - t * 0.16 + 10) % 1.3) * w - w * 0.15, y * h, h, c, 0);
  auto(g, w * 0.46, h * (0.53 + Math.sin(t * 1.9) * 0.13), h, C.rose, Math.cos(t * 1.9) * 0.22);
  g.fillStyle = "#2fa89b";
  g.strokeStyle = C.encre;
  g.lineWidth = h * 0.012;
  for (let i = 0; i < 6; i++) {
    const x = w * 1.1 - ((t * w * 0.75 + (i * w) / 5) % (w * 1.2));
    for (const y of [0.12, 0.9]) {
      g.beginPath();
      g.arc(x, h * y, h * 0.07, 0, TAU);
      g.fill();
      g.stroke();
    }
  }
}

function auto(g: G, x: number, y: number, h: number, c: string, a: number) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.fillStyle = c;
  g.strokeStyle = C.encre;
  g.lineWidth = h * 0.014;
  g.beginPath();
  g.roundRect(-h * 0.14, -h * 0.07, h * 0.28, h * 0.14, h * 0.04);
  g.fill();
  g.stroke();
  g.fillStyle = C.nuit;
  g.fillRect(h * 0.01, -h * 0.05, h * 0.06, h * 0.1);
  g.fillRect(-h * 0.1, -h * 0.045, h * 0.035, h * 0.09);
  g.restore();
}

const SCENES = [route, saut, dessus];

/** Une scène de jeu inventée, dans un rectangle. */
export function scene(g: G, x: number, y: number, w: number, h: number, i: number, t: number) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x, y);
  SCENES[((i % 3) + 3) % 3](g, w, h, t);
  g.restore();
}

const police = (taille: number) => `800 ${taille}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage") || "system-ui"}`;

function etiquette(g: G, texte: string, cx: number, cy: number, taille: number, max: number, angle: number) {
  g.font = police(taille);
  const mots = texte.split(" ");
  const lignes: string[] = [];
  for (const m of mots) {
    const essai = lignes.length ? `${lignes[lignes.length - 1]} ${m}` : m;
    if (lignes.length && g.measureText(essai).width <= max) lignes[lignes.length - 1] = essai;
    else lignes.push(m);
  }
  const l = Math.max(...lignes.map((x) => g.measureText(x).width)) + taille * 1.1;
  const h = lignes.length * taille * 1.08 + taille * 0.8;
  g.save();
  g.translate(cx, cy);
  g.rotate(angle);
  g.fillStyle = C.encre;
  g.beginPath();
  g.roundRect(-l / 2, -h / 2 + 6, l, h, taille * 0.4);
  g.fill();
  g.fillStyle = C.jaune;
  g.strokeStyle = C.encre;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(-l / 2, -h / 2, l, h, taille * 0.4);
  g.fill();
  g.stroke();
  g.fillStyle = C.encre;
  g.textAlign = "center";
  g.textBaseline = "middle";
  lignes.forEach((x, i) => g.fillText(x, 0, (i - (lignes.length - 1) / 2) * taille * 1.08 + 1));
  g.restore();
}

function coeur(g: G, x: number, y: number, s: number, c: string) {
  g.beginPath();
  g.moveTo(x, y + s * 0.8);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.3, x - s * 0.7, y - s * 1.3, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.3, x, y + s * 0.8);
  g.fillStyle = c;
  g.fill();
  g.strokeStyle = C.encre;
  g.lineWidth = 3;
  g.stroke();
}

const TITRES = ["Mon chien conduit mieux que moi", "Personne ne m'avait prévenu", "Le saut de l'année"];

let petit: HTMLCanvasElement | null = null;

/** La vidéo verticale : image entière au centre, fond flouté, titre. Repère : 360 de large. */
export function ecranJeu(g: G, h: number, t: number, coupe = 1.5) {
  const n = Math.floor(t / coupe);
  const depuis = t - n * coupe;
  const zoom = 1.06 - Math.min(1, depuis / 0.25) * 0.06;
  petit ??= Object.assign(document.createElement("canvas"), { width: 20, height: 40 });
  scene(petit.getContext("2d")!, 0, 0, 20, 40, n, t);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(petit, -40, -60, 440, h + 120);
  const ih = 212;
  const y = h * 0.47 - ih / 2;
  g.save();
  g.translate(180, y + ih / 2);
  g.scale(zoom, zoom);
  scene(g, -190, -ih / 2, 380, ih, n, t);
  g.restore();
  etiquette(g, TITRES[Math.floor(t / (coupe * 4)) % 3], 180, y - 78, 29, 270, -0.04);
  if (depuis < 0.06) {
    g.fillStyle = "rgba(255,255,255,.4)";
    g.fillRect(0, 0, 360, h);
  }
  const b = 1 + Math.max(0, Math.sin(t * 5)) * 0.18;
  coeur(g, 322, h * 0.7, 15 * b, C.rose);
  g.fillStyle = C.blanc;
  g.strokeStyle = C.encre;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(305, h * 0.755, 34, 27, 11);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(307, h * 0.825 + 12);
  g.lineTo(337, h * 0.825);
  g.lineTo(322, h * 0.825 + 28);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "rgba(26,11,46,.5)";
  g.fillRect(24, h - 52, 312, 7);
  g.fillStyle = C.blanc;
  g.fillRect(24, h - 52, 312 * ((t / 9) % 1), 7);
}

/** Une vraie vidéo dans l'écran : image entière, fond flouté, titre si elle n'est pas déjà montée. */
export function ecranSource(g: G, h: number, v: HTMLVideoElement | HTMLCanvasElement, titre?: string) {
  const L = v instanceof HTMLVideoElement ? v.videoWidth : v.width;
  const H = v instanceof HTMLVideoElement ? v.videoHeight : v.height;
  g.fillStyle = C.encre;
  g.fillRect(0, 0, 360, h);
  if (!L || !H) return;
  petit ??= Object.assign(document.createElement("canvas"), { width: 20, height: 40 });
  const p = petit.getContext("2d")!;
  const k = Math.max(20 / L, 40 / H);
  p.drawImage(v, (20 - L * k) / 2, (40 - H * k) / 2, L * k, H * k);
  g.imageSmoothingQuality = "high";
  g.drawImage(petit, -40, -60, 440, h + 120);
  const portrait = H > L;
  // Toujours l'image entière, jamais recadrée : le fond flouté complète.
  const e = Math.min(360 / L, h / H);
  g.drawImage(v, (360 - L * e) / 2, (h - H * e) / 2, L * e, H * e);
  if (!portrait && titre) etiquette(g, titre, 180, h / 2 - (H * e) / 2 - 74, 29, 270, -0.04);
}

export function ecranProfil(g: G, h: number, t: number, etat: "abonnes" | "vide" | "non") {
  g.fillStyle = etat === "non" ? C.beige : C.fond;
  g.fillRect(0, 0, 360, h);
  g.strokeStyle = C.encre;
  g.lineWidth = 6;
  if (etat === "non") {
    g.save();
    g.setLineDash([22, 18]);
    g.lineDashOffset = -t * 26;
    g.beginPath();
    g.arc(180, h * 0.42, 92, 0, TAU);
    g.stroke();
    g.restore();
    const b = 1 + Math.sin(t * 3) * 0.06;
    g.lineWidth = 16 * b;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(180, h * 0.42 - 40 * b);
    g.lineTo(180, h * 0.42 + 40 * b);
    g.moveTo(180 - 40 * b, h * 0.42);
    g.lineTo(180 + 40 * b, h * 0.42);
    g.stroke();
    return;
  }
  const plein = etat === "abonnes";
  g.fillStyle = plein ? C.turquoise : C.beige;
  g.beginPath();
  g.arc(180, 112, 52, 0, TAU);
  g.fill();
  g.stroke();
  if (plein) {
    g.fillStyle = C.encre;
    g.beginPath();
    g.arc(162, 104, 6, 0, TAU);
    g.arc(198, 104, 6, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(180, 114, 22, 0.2, Math.PI - 0.2);
    g.stroke();
  }
  g.fillStyle = plein ? C.encre : C.beige;
  g.beginPath();
  g.roundRect(100, 184, 160, 16, 8);
  g.fill();
  for (let i = 0; i < 9; i++) {
    const x = 18 + (i % 3) * 110;
    const y = 222 + Math.floor(i / 3) * 134;
    if (plein) scene(g, x, y, 104, 126, i, t * 0.5 + i * 3);
    g.setLineDash(plein ? [] : [10, 9]);
    g.lineWidth = plein ? 4 : 3;
    g.strokeStyle = plein ? C.encre : "#b9aacb";
    g.strokeRect(x, y, 104, 126);
  }
  g.setLineDash([]);
  if (plein) {
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.4 + i / 4) % 1;
      g.globalAlpha = 1 - p;
      coeur(g, 70 + i * 74 + Math.sin(t * 3 + i) * 12, h - 40 - p * h * 0.75, 15, [C.rose, C.orange, C.jaune, C.turquoise][i]);
      g.globalAlpha = 1;
    }
  }
}

export function ecranLien(g: G, h: number, t: number, relie: boolean) {
  g.fillStyle = relie ? C.jaune : C.fond;
  g.fillRect(0, 0, 360, h);
  g.save();
  g.translate(180, h / 2);
  if (relie) {
    g.rotate(t * 0.25);
    g.fillStyle = C.orange;
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-60, -h);
      g.lineTo(60, -h);
      g.fill();
    }
    g.rotate(-t * 0.25);
  }
  g.fillStyle = relie ? C.encre : C.blanc;
  g.strokeStyle = C.encre;
  g.lineWidth = 9;
  g.beginPath();
  g.arc(0, 0, 96, 0, TAU);
  g.fill();
  g.stroke();
  g.lineCap = "round";
  g.lineJoin = "round";
  if (relie) {
    g.strokeStyle = C.blanc;
    g.lineWidth = 20;
    g.beginPath();
    g.moveTo(-40, 4);
    g.lineTo(-10, 34);
    g.lineTo(42, -30);
    g.stroke();
  } else {
    g.lineWidth = 11;
    g.rotate(-0.7);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.roundRect(s * 30 - 34, -19, 68, 38, 19);
      g.stroke();
    }
  }
  g.restore();
}
