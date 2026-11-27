# Lien → clips (pivot du 26/11/2026)

Le joueur colle le lien d'une vidéo (YouTube, Twitch, Kick, X) ou envoie un fichier.
XPclip transcrit, choisit les meilleurs moments et monte des clips 9:16 sous-titrés.

## Les pièces
- Moteur : `moteur/url.mjs` (lien → clips, sur un Mac), `moteur/clip.mjs` (un clip : cadrage, sous-titres, accroche, son),
  `moteur/clip/ia.mjs` (Groq + Claude), `moteur/clip/sous-titres.mjs`, `moteur/clip/visages.py` (OpenCV, YuNet).
- Machine de montage en ligne : `moteur/bac-clips.mjs` + `moteur/bac.sh clips tache.json`, pilotée par `src/lib/atelier.ts`
  (`demarrerClips`, `envoyerRendu`). La machine n'a aucune clé.
- Serveur : `src/lib/clips-en-ligne.ts` (état des lots dans le stockage `videos/lots/<compte>/<lot>/`),
  routes `src/app/api/clips/` (lancer, suivre, lister), `src/app/api/clips/suivi` (nouvelles de la machine).
- Écrans : `src/components/clips/Studio.tsx` (lien → réglages → suivi → clips), `Reglages.tsx`, `MesClips.tsx` ;
  pages `/app/creer` (dans l'appli) et `/clips` (essai hors appli). Réglages : `src/lib/clips-options.ts`.

## Mode local (Mac)
`npm run build` puis `STUDIO_LOCAL=1 npx next start -p 3240 -H 0.0.0.0`. Le moteur tourne sur le Mac.
Il faut : ffmpeg, yt-dlp (`brew install yt-dlp`), `~/.xpclip-modeles/venv` (opencv) et `yunet.onnx`,
et les clés `GROQ_API_KEY` + `ANTHROPIC_API_KEY` dans `~/LootClip/moteur/.env`.

## Mise en ligne : à faire par Martin
1. Vercel → projet → Settings → Environment Variables, en **Production**, type **Sensitive**, sans `NEXT_PUBLIC_` :
   `GROQ_API_KEY` et `ANTHROPIC_API_KEY` (les mêmes que dans `moteur/.env`).
2. Sans ces 2 clés, la route répond « bientôt » : rien ne casse.

## Limites connues
- YouTube bloque les machines en ligne (« Sign in to confirm you're not a bot ») : en ligne, l'écran propose d'envoyer le fichier.
  On ne contourne pas cette protection.
- Le quota des clips est compté dans le stockage (`compteur-AAAA-MM.json`), pas encore dans la base ni dans la barre de quota de l'appli.
- Taille maximale d'un fichier envoyé : celle du projet Supabase (à vérifier pour les longues vidéos).
- Transcription : 2 h de vidéo au plus (25 Mo de son pour Groq).

## Démo de l'onboarding (écrans 1 et 2)
- En ligne : les clips de Martin (`src/components/onboarding/demo.ts`). Démo Michou (« J'ai brisé tous les mythes de GTA 6 ») prête hors dépôt dans `~/.xpclip-modeles/demo-michou` (fichiers + `demo-michou.ts` à recopier dans `public/v4/demo` et `demo.ts`).
- Vidéo d'un créateur tiers : **ne pas mettre en ligne sans son accord écrit** (droit d'auteur, droit à l'image). Sinon, refaire la démo avec une vidéo de Martin.
