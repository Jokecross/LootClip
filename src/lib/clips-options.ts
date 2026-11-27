/*
 * Les réglages qu'un joueur choisit avant de lancer ses clips.
 * Lu par l'écran (studio) et transmis tel quel au moteur (moteur/url.mjs --options).
 * Les valeurs (clés) sont celles que comprend le moteur : ne les renomme pas sans changer moteur/clip/.
 */

export const TYPES_CLIP = {
  meilleur: { nom: "Le meilleur", detail: "L'IA prend les moments les plus forts." },
  drole: { nom: "Moments drôles", detail: "Fous rires, fails et répliques cultes." },
  conseils: { nom: "Conseils", detail: "Astuces et infos utiles, claires et complètes." },
  reactions: { nom: "Réactions", detail: "Coups de gueule, surprises, rage." },
  histoires: { nom: "Histoires", detail: "Une anecdote racontée du début à la fin." },
} as const;

export const DUREES_CLIP = {
  courte: { nom: "Courte", detail: "15 à 30 s", min: 15, max: 30 },
  moyenne: { nom: "Moyenne", detail: "30 à 60 s", min: 30, max: 60 },
  longue: { nom: "Longue", detail: "60 à 90 s", min: 60, max: 90 },
} as const;

/** Couleur du mot prononcé. « aucun » : pas de sous-titres. */
export const COULEURS_SOUS_TITRES = {
  jaune: { nom: "Jaune", valeur: "#F9D477" },
  rose: { nom: "Rose", valeur: "#F05FA5" },
  turquoise: { nom: "Turquoise", valeur: "#6FE3D6" },
  orange: { nom: "Orange", valeur: "#F2934F" },
  blanc: { nom: "Blanc", valeur: "#FFFFFF" },
  aucun: { nom: "Sans", valeur: "" },
} as const;

export const PLACEMENTS = {
  auto: { nom: "Auto", detail: "Là où ça gêne le moins." },
  haut: { nom: "En haut", detail: "" },
  milieu: { nom: "Au milieu", detail: "" },
  bas: { nom: "En bas", detail: "" },
} as const;

export const FORMATS = {
  auto: { nom: "Auto", detail: "Cadre sur le visage, facecam en haut si besoin." },
  plein: { nom: "Plein écran", detail: "Image recadrée au centre, sans bandes." },
  flou: { nom: "Image entière", detail: "Toute l'image, sur un fond flouté." },
} as const;

export const NOMBRES_CLIPS = [2, 4, 6, 8] as const;

export type OptionsClips = {
  type: keyof typeof TYPES_CLIP;
  duree: keyof typeof DUREES_CLIP;
  couleur: keyof typeof COULEURS_SOUS_TITRES;
  placement: keyof typeof PLACEMENTS;
  format: keyof typeof FORMATS;
  accroche: boolean;
  nombre: (typeof NOMBRES_CLIPS)[number];
};

export const OPTIONS_PAR_DEFAUT: OptionsClips = {
  type: "meilleur",
  duree: "moyenne",
  couleur: "jaune",
  placement: "auto",
  format: "auto",
  accroche: true,
  nombre: 4,
};

/** Garde seulement des valeurs connues (ce qui vient du navigateur n'est pas fiable). */
export function optionsPropres(brut: unknown): OptionsClips {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const dans = <T extends object>(table: T, v: unknown, defaut: keyof T) => (typeof v === "string" && v in table ? (v as keyof T) : defaut);
  const nombre = NOMBRES_CLIPS.includes(Number(o.nombre) as OptionsClips["nombre"]) ? (Number(o.nombre) as OptionsClips["nombre"]) : OPTIONS_PAR_DEFAUT.nombre;
  return {
    type: dans(TYPES_CLIP, o.type, OPTIONS_PAR_DEFAUT.type),
    duree: dans(DUREES_CLIP, o.duree, OPTIONS_PAR_DEFAUT.duree),
    couleur: dans(COULEURS_SOUS_TITRES, o.couleur, OPTIONS_PAR_DEFAUT.couleur),
    placement: dans(PLACEMENTS, o.placement, OPTIONS_PAR_DEFAUT.placement),
    format: dans(FORMATS, o.format, OPTIONS_PAR_DEFAUT.format),
    accroche: o.accroche !== false,
    nombre,
  };
}
