/*
 * La vidéo de démo du site (landing + écrans 1 et 2 de l'onboarding), passée pour de vrai
 * dans le moteur XPclip le 26/11/2026 (4 clips courts, réglages par défaut). Fichiers dans public/v4/demo.
 * Vidéo de MichouGaming : mise en ligne le 26/11/2026 sur décision de Martin, malgré l'avertissement
 * (droit d'auteur, droit à l'image). Pour revenir aux clips de Martin : ~/.xpclip-modeles/demo-michou/demo-martin.ts.
 * `debut` et `largeur` : place du moment dans la vidéo, en % de sa durée.
 * `pourquoi` et `forces` : résumé de l'explication donnée par Claude pour la note (moments.json du moteur).
 */
export const DEMO = {
  lien: "youtu.be/vJ9aE-18z_I",
  plateforme: "YouTube",
  chaine: "MichouGaming",
  titreVideo: "J'ai brisé tous les mythes de GTA 6",
  duree: "27:52",
  dureeTexte: "28 min",
  avant: "demo/avant",
  /** Les clips du moteur ont déjà leurs sous-titres gravés. */
  sousTitresDessines: false,
  clips: [
    { nom: "demo/clip-1", titre: "Mandy cache un corps dans GTA 6", score: 90, duree: "0:31", debut: 19.8, largeur: 5, pourquoi: "Une théorie glauque, avec des indices visibles à l'écran.", forces: ["Théorie qui intrigue", "Indices concrets", "Pousse aux commentaires"] },
    { nom: "demo/clip-2", titre: "J'ai trouvé un bébé alien dans GTA 6", score: 86, duree: "0:27", debut: 85.8, largeur: 5, pourquoi: "La promesse est tenue en direct, avec une vraie surprise.", forces: ["Promesse tenue", "Réaction sincère", "Chute absurde"] },
    { nom: "demo/clip-3", titre: "Un alligator m'a avalé en entier", score: 82, duree: "0:25", debut: 6.2, largeur: 5, pourquoi: "Une question simple, un pari risqué, une chute choc.", forces: ["Question simple", "Pari risqué", "Chute choc"] },
    { nom: "demo/clip-4", titre: "Un chien en jet ski vient me sauver", score: 78, duree: "0:28", debut: 24.7, largeur: 5, pourquoi: "Un easter egg improbable, prouvé à l'écran.", forces: ["Easter egg rare", "Preuve à l'écran", "Fin surprenante"] },
  ],
};

export type Demo = typeof DEMO;

/*
 * Deuxième démo, pour le studio de tournage seulement (pas la landing ni l'onboarding), ajoutée le 28/11/2026
 * sur demande de Martin. Vidéo de CYRILmp4, passée pour de vrai dans le moteur (4 clips courts, réglages par défaut,
 * notes réelles). Fichiers dans public/v4/demo-cyril (extraits de 10 s, 432×768, sans son, comme ceux de Michou).
 * Même avertissement que pour Michou : droit d'auteur et droit à l'image du créateur.
 */
export const DEMO_CYRIL: Demo = {
  lien: "youtu.be/1M8SUwBob5s",
  plateforme: "YouTube",
  chaine: "CYRILmp4",
  titreVideo: "GTA 6 mais c'est en FRANCE !",
  duree: "13:19",
  dureeTexte: "13 min",
  avant: "demo-cyril/clip-4",
  sousTitresDessines: false,
  clips: [
    { nom: "demo-cyril/clip-1", titre: "Le SAMU français se fait flasher par un radar", score: 82, duree: "0:31", debut: 70.1, largeur: 5, pourquoi: "Situation absurde, répliques drôles et chute sur le radar.", forces: ["Humour absurde", "Répliques cultes", "Chute sur le radar"] },
    { nom: "demo-cyril/clip-2", titre: "GTA en France avec François Damiens", score: 76, duree: "0:32", debut: 89.8, largeur: 5, pourquoi: "Idée de scénario drôle et référence culturelle très française.", forces: ["Idée originale", "Référence française", "Chute en pirouette"] },
    { nom: "demo-cyril/clip-3", titre: "Les panneaux français dans GTA, c'est trop vrai", score: 72, duree: "0:35", debut: 7.1, largeur: 5, pourquoi: "Clichés français reconnaissables par tous, enchaînés avec humour.", forces: ["Clichés français", "Réactions spontanées", "Très partageable"] },
    { nom: "demo-cyril/clip-4", titre: "Et si GTA se passait en France ?", score: 62, duree: "0:33", debut: 1.4, largeur: 5, pourquoi: "Concept accrocheur qui parle à tous les fans de GTA.", forces: ["Concept accrocheur", "Humour de clichés", "Promesse claire"] },
  ],
};

/** Les démos du studio de tournage, au choix dans la régie. */
export const DEMOS = { michou: DEMO, cyril: DEMO_CYRIL } as const;
export type NomDemo = keyof typeof DEMOS;

/** La démo dont le lien collé est la vidéo (même identifiant YouTube), sinon null. */
export function demoDuLien(lien: string): NomDemo | null {
  const id = lien.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/)([\w-]{11})/)?.[1];
  if (!id) return null;
  return (Object.keys(DEMOS) as NomDemo[]).find((k) => DEMOS[k].lien.endsWith(id)) ?? null;
}
