/*
 * La vidéo de démo des écrans 1 et 2 de l'onboarding. Fichiers dans public/v4.
 * Pour l'instant : les vrais montages XPclip des parties de Martin.
 * Une démo tirée d'une vidéo de MichouGaming est prête hors du dépôt (~/.xpclip-modeles/demo-michou) :
 * à rebrancher seulement avec l'accord écrit du créateur (voir docs/lien-clips.md).
 * `debut` et `largeur` : place du moment dans la vidéo, en % de sa durée.
 */
export const DEMO = {
  lien: "twitch.tv/videos/2210457",
  plateforme: "Twitch",
  chaine: "",
  duree: "1:42:08",
  dureeTexte: "1 h 42",
  avant: "clips/brut-defi",
  /** Ces montages n'ont pas de sous-titres gravés : l'écran les dessine par-dessus. */
  sousTitresDessines: true,
  clips: [
    { nom: "clips/defi", titre: "Il n'aurait jamais dû me chercher", score: 94, debut: 8, largeur: 6 },
    { nom: "clips/drole", titre: "Mon chien conduit mieux que moi", score: 89, debut: 42, largeur: 6 },
    { nom: "clips/mission", titre: "Je voulais juste rentrer chez moi", score: 83, debut: 71, largeur: 6 },
  ],
};
