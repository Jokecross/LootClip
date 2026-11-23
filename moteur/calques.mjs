/*
 * Calques transparents posés sur la vidéo, dessinés dans le style XPclip
 * (carte jaune, contour encre, ombre pleine, Bricolage ExtraBold).
 * Format plein cadre 1080 × 1920, pour un overlay direct dans FFmpeg.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(ICI, "polices", "Bricolage-ExtraBold.ttf"), "Bricolage");

// Emojis du titre : police Noto sur la machine de montage (bac.sh), police Apple sur Mac.
const EMOJIS = ["/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", "/System/Library/Fonts/Apple Color Emoji.ttc"].find(existsSync);
if (EMOJIS) GlobalFonts.registerFromPath(EMOJIS, "Emojis");
else console.warn("Police d'emojis absente : les emojis du titre ne s'afficheront pas.");

const L = 1080;
const H = 1920;
const ENCRE = "#1A0B2E";
const JAUNE = "#F9D477";
const ROSE = "#F05FA5";
const CREME = "#FDF5EA";

function decouper(ctx, texte, largeurMax) {
  const mots = texte.trim().split(/\s+/);
  const lignes = [];
  let ligne = "";
  for (const mot of mots) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ctx.measureText(essai).width <= largeurMax || !ligne) ligne = essai;
    else {
      lignes.push(ligne);
      ligne = mot;
    }
  }
  if (ligne) lignes.push(ligne);
  return lignes;
}

function carteArrondie(ctx, x, y, l, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, l, h, r);
}

/**
 * L'accroche : une carte jaune en haut de l'écran, sous la zone des onglets de TikTok.
 * `echelle` et `angle` servent à l'animation « pop » (la carte grossit en tournant légèrement).
 */
export async function dessinerAccroche(texte, echelle = 1, angle = -2) {
  const toile = createCanvas(L, H);
  const ctx = toile.getContext("2d");
  const largeurTexte = 820;

  // Taille de police qui fait tenir le texte en 3 lignes maximum
  let taille = 74;
  let lignes;
  do {
    ctx.font = `${taille}px Bricolage, Emojis`;
    lignes = decouper(ctx, texte, largeurTexte);
    if (lignes.length <= 3) break;
    taille -= 4;
  } while (taille > 44);
  lignes = lignes.slice(0, 3);

  const interligne = taille * 1.08;
  const padH = 46;
  const padV = 38;
  const largeur = Math.min(960, Math.max(...lignes.map((l) => ctx.measureText(l).width)) + padH * 2);
  const hauteur = lignes.length * interligne + padV * 2 - (interligne - taille);
  const x = (L - largeur) / 2;
  const y = 300;

  // Transformation autour du centre de la carte (animation)
  const cx = L / 2;
  const cy = y + hauteur / 2;
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(echelle, echelle);
  ctx.translate(-cx, -cy);

  // Ombre pleine décalée, puis la carte
  ctx.fillStyle = ENCRE;
  carteArrondie(ctx, x, y + 12, largeur, hauteur, 34);
  ctx.fill();
  ctx.fillStyle = JAUNE;
  ctx.strokeStyle = ENCRE;
  ctx.lineWidth = 7;
  carteArrondie(ctx, x, y, largeur, hauteur, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = ENCRE;
  ctx.textAlign = "center";
  // Ligne de base commune : en mode « top », une police d'emojis décale toute sa ligne vers le haut.
  ctx.font = `${taille}px Bricolage`;
  ctx.textBaseline = "top";
  const haut = ctx.measureText("H").actualBoundingBoxAscent;
  ctx.textBaseline = "alphabetic";
  const base = ctx.measureText("H").actualBoundingBoxAscent - haut;
  ctx.font = `${taille}px Bricolage, Emojis`;
  lignes.forEach((l, i) => ctx.fillText(l, L / 2, y + padV + i * interligne + taille * 0.07 + base));

  return toile.encode("png");
}

/** Rebond en fin de course : dépasse un peu la cible puis revient (effet « pop »). */
const rebond = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Les images de l'apparition de l'accroche : 12 images (0,4 s à 30 i/s), de petite et penchée à sa place. */
export async function dessinerAccrocheAnimee(texte, images = 12) {
  const resultat = [];
  for (let k = 0; k < images; k++) {
    const t = (k + 1) / images;
    const e = rebond(t);
    resultat.push(await dessinerAccroche(texte, 0.35 + 0.65 * e, -9 + 7 * e));
  }
  return resultat;
}

/** Le filigrane de l'offre gratuite : une pastille « XPclip » à gauche, hors des boutons de TikTok. */
export async function dessinerFiligrane() {
  const toile = createCanvas(L, H);
  const ctx = toile.getContext("2d");
  const x = 40;
  const y = 1290;
  const h = 70;
  ctx.font = "38px Bricolage";
  const largeur = ctx.measureText("XPclip").width + h + 40;

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = CREME;
  ctx.strokeStyle = ENCRE;
  ctx.lineWidth = 5;
  carteArrondie(ctx, x, y, largeur, h, h / 2);
  ctx.fill();
  ctx.stroke();

  // Petit logo : carré rose, « XP » crème cerclé d'encre, barre d'XP jaune
  const lx = x + 12;
  const ly = y + 11;
  ctx.fillStyle = ROSE;
  ctx.strokeStyle = ENCRE;
  ctx.lineWidth = 3;
  carteArrondie(ctx, lx, ly, 48, 48, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = "24px Bricolage";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeText("XP", lx + 24, ly + 29);
  ctx.fillStyle = CREME;
  ctx.fillText("XP", lx + 24, ly + 29);
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  carteArrondie(ctx, lx + 8, ly + 34, 32, 7, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = JAUNE;
  carteArrondie(ctx, lx + 9, ly + 35, 19, 5, 2.5);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.font = "38px Bricolage";

  ctx.fillStyle = ENCRE;
  ctx.textBaseline = "middle";
  ctx.fillText("XPclip", lx + 60, y + h / 2 + 2);
  return toile.encode("png");
}
