"use client";
/*
 * Le monde 3D : une seule toile pour tout le site. Les pages posent des ancres (<Ancre nom="manette" />),
 * et l'objet du même nom vient se placer dessus. Changer d'écran, c'est déplacer les ancres : les objets voyagent.
 */
export type Nom = "manette" | "manette2" | "telephone" | "telephone2" | "telephone3" | "clip0" | "clip1" | "clip2" | "clip3" | "clip4" | "pieces" | "cadenas" | "chrono";

export type Pose = {
  rx?: number;
  ry?: number;
  rz?: number;
  /** Flottement, en pixels. */
  flotte?: number;
  /** Suit la souris : 0 pas du tout, 1 normal. */
  suit?: number;
  /** Avant ou derrière les autres objets, en pixels. */
  z?: number;
};

export type Donnees = {
  ecran?: "jeu" | "abonnes" | "vide" | "non" | "relier" | "relie";
  source?: HTMLVideoElement | HTMLCanvasElement | null;
  titre?: string;
  etat?: "oui" | "non";
  /** Change de valeur : l'objet fait un tour sur lui-même. */
  tour?: number;
  /** Pièces : de 0 à 1. Manette : agitation. */
  valeur?: number;
  /** Va et vient en arc de cercle d'un objet à l'autre. */
  flux?: { de: Nom; vers: Nom; delai: number; duree?: number };
  /** Décolle vers le haut. */
  envol?: boolean;
  retard?: number;
  /** Rythme des coupes de l'écran « jeu », en secondes. */
  coupe?: number;
};

export type Entree = { el: HTMLElement; nom: Nom; pose: Pose; donnees: Donnees };

export const ancres = new Set<Entree>();
let reveil: () => void = () => {};
export const surAncre = (f: () => void) => {
  reveil = f;
};
export function inscrire(e: Entree) {
  ancres.add(e);
  reveil();
  return () => {
    ancres.delete(e);
  };
}

/* Éclats d'étoiles, à une position de l'écran. */
type Eclat = { x: number; y: number; n: number };
export const eclatsEnAttente: Eclat[] = [];
export function eclats(x: number, y: number, n = 14) {
  eclatsEnAttente.push({ x, y, n });
  reveil();
}

/** Dernier clic : les changements de couleur partent de là. */
export const clic = { x: 0.5, y: 0.6 };
if (typeof window !== "undefined")
  window.addEventListener(
    "pointerdown",
    (e) => {
      clic.x = e.clientX / innerWidth;
      clic.y = e.clientY / innerHeight;
    },
    { capture: true, passive: true },
  );
