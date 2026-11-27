/*
 * La vidéo de démo du site (landing + écrans 1 et 2 de l'onboarding), passée pour de vrai
 * dans le moteur XPclip le 26/11/2026 (4 clips courts, réglages par défaut). Fichiers dans public/v4/demo.
 * Vidéo de MichouGaming : mise en ligne le 26/11/2026 sur décision de Martin, malgré l'avertissement
 * (droit d'auteur, droit à l'image). Pour revenir aux clips de Martin : ~/.xpclip-modeles/demo-michou/demo-martin.ts.
 * `debut` et `largeur` : place du moment dans la vidéo, en % de sa durée.
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
    { nom: "demo/clip-1", titre: "Mandy cache un corps dans GTA 6", score: 90, duree: "0:31", debut: 19.8, largeur: 5 },
    { nom: "demo/clip-2", titre: "J'ai trouvé un bébé alien dans GTA 6", score: 86, duree: "0:27", debut: 85.8, largeur: 5 },
    { nom: "demo/clip-3", titre: "Un alligator m'a avalé en entier", score: 82, duree: "0:25", debut: 6.2, largeur: 5 },
    { nom: "demo/clip-4", titre: "Un chien en jet ski vient me sauver", score: 78, duree: "0:28", debut: 24.7, largeur: 5 },
  ],
};
