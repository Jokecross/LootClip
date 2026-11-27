/*
 * Sous-titres « mot à mot » des clips XPclip.
 * Les mots arrivent par petits groupes (3 mots maximum), le mot prononcé passe en jaune.
 * Style XPclip : Bricolage ExtraBold en capitales, blanc, contour encre épais, ombre pleine.
 *
 * Chaque état (un groupe + son mot actif) devient une image transparente de 1080 × BANDE px,
 * enchaînées ensuite par FFmpeg avec leur durée exacte (démultiplexeur « concat »).
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
GlobalFonts.registerFromPath(join(ICI, "..", "polices", "Bricolage-ExtraBold.ttf"), "Bricolage");

export const L = 1080;
export const BANDE = 420;
const ENCRE = "#1A0B2E";
const JAUNE = "#F9D477";
const BLANC = "#FFFFFF";
const TAILLE = 88;
const LARGEUR_MAX = 940;

const MOTS_MAX = 3;
const CARACTERES_MAX = 20;
const PAUSE_COUPE = 0.4; // un silence plus long ferme le groupe

/**
 * Regroupe les mots : 3 au plus, coupure sur la ponctuation forte ou un silence.
 * mots : [{ texte, debut, fin }] (secondes) → groupes : [{ mots, debut, fin }]
 */
export function grouper(mots) {
  const groupes = [];
  let g = null;
  for (let i = 0; i < mots.length; i++) {
    const m = mots[i];
    const precedent = mots[i - 1];
    const longueur = g ? g.mots.map((x) => x.texte).join(" ").length + 1 + m.texte.length : 0;
    const couper =
      !g ||
      g.mots.length >= MOTS_MAX ||
      longueur > CARACTERES_MAX ||
      (precedent && m.debut - precedent.fin > PAUSE_COUPE) ||
      (precedent && /[.!?…]$/.test(precedent.texte));
    if (couper) {
      g = { mots: [], debut: m.debut, fin: m.fin };
      groupes.push(g);
    }
    g.mots.push(m);
    g.fin = m.fin;
  }
  return groupes;
}

const nettoyer = (t) => t.replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim().toUpperCase();

/** Dessine un groupe, le mot d'indice `actif` en jaune. `echelle` sert au « pop » d'apparition. */
export function dessinerGroupe(groupe, actif, echelle = 1, couleur = JAUNE) {
  const toile = createCanvas(L, BANDE);
  const ctx = toile.getContext("2d");
  const textes = groupe.mots.map((m) => nettoyer(m.texte));

  let taille = TAILLE;
  ctx.font = `${taille}px Bricolage`;
  const espace = () => ctx.measureText(" ").width;
  const largeurDe = (ts) => ts.reduce((s, t) => s + ctx.measureText(t).width, 0) + espace() * (ts.length - 1);

  // Une ligne si ça tient, sinon deux ; on réduit la police en dernier recours
  let lignes = [textes.map((t, i) => ({ t, i }))];
  if (largeurDe(textes) > LARGEUR_MAX && textes.length > 1) {
    const coupe = Math.ceil(textes.length / 2);
    lignes = [lignes[0].slice(0, coupe), lignes[0].slice(coupe)];
  }
  while (Math.max(...lignes.map((l) => largeurDe(l.map((x) => x.t)))) > LARGEUR_MAX && taille > 50) {
    taille -= 4;
    ctx.font = `${taille}px Bricolage`;
  }

  const interligne = taille * 1.08;
  const hauteurBloc = lignes.length * interligne;
  const cx = L / 2;
  const cy = BANDE / 2;
  ctx.translate(cx, cy);
  ctx.scale(echelle, echelle);
  ctx.translate(-cx, -cy);

  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  lignes.forEach((ligne, n) => {
    const y = cy - hauteurBloc / 2 + interligne * (n + 0.5);
    let x = cx - largeurDe(ligne.map((l) => l.t)) / 2;
    for (const { t, i } of ligne) {
      const w = ctx.measureText(t).width;
      // ombre pleine, contour, puis remplissage
      ctx.fillStyle = ENCRE;
      ctx.strokeStyle = ENCRE;
      ctx.lineWidth = taille * 0.2;
      ctx.strokeText(t, x + 5, y + 8);
      ctx.fillText(t, x + 5, y + 8);
      ctx.strokeText(t, x, y);
      ctx.fillStyle = i === actif ? couleur : BLANC;
      ctx.fillText(t, x, y);
      x += w + espace();
    }
  });
  return toile.encode("png");
}

export function dessinerVide() {
  return createCanvas(L, BANDE).encode("png");
}

/**
 * Toutes les images et leur durée, de 0 à `total` secondes.
 * Retourne [{ png: () => Promise<Buffer>, duree }] dans l'ordre (dessin à la demande, une image à la fois).
 */
export function chronologie(groupes, total, couleur = JAUNE) {
  const etapes = [];
  let t = 0;
  const pousser = (png, jusqua) => {
    const d = jusqua - t;
    if (d <= 0.001) return;
    etapes.push({ png, duree: d });
    t = jusqua;
  };
  for (let g = 0; g < groupes.length; g++) {
    const groupe = groupes[g];
    const suivant = groupes[g + 1];
    // Le groupe reste affiché jusqu'au suivant si le silence est court
    const finAffichage = suivant && suivant.debut - groupe.fin < 0.6 ? suivant.debut : Math.min(total, groupe.fin + 0.3);
    pousser(() => dessinerVide(), groupe.debut);
    // Pop d'apparition : 2 images agrandies avant la taille normale
    const pop = [0.86, 1.06];
    for (let k = 0; k < pop.length && t < groupe.mots[0].fin; k++) pousser(() => dessinerGroupe(groupe, 0, pop[k], couleur), Math.min(t + 1 / 30, groupe.mots[0].fin));
    groupe.mots.forEach((m, i) => {
      const fin = i + 1 < groupe.mots.length ? groupe.mots[i + 1].debut : finAffichage;
      pousser(() => dessinerGroupe(groupe, i, 1, couleur), Math.max(fin, t + 1 / 30));
    });
  }
  pousser(() => dessinerVide(), total);
  return etapes;
}
