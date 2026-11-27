# Liens YouTube via Apify — fiche pour le développeur

Décision de Martin (27/11/2026) : les liens YouTube passent par l'acteur Apify
[`lurkapi/youtube-video-clipper`](https://apify.com/lurkapi/youtube-video-clipper). Voir CLAUDE.md.

## Ce qui existe déjà
- **Plage de 20 min** : le client choisit `plage = { debut, fin }` (secondes) dans le studio.
  Elle arrive dans la tâche de la machine de montage : `t.plage` (`moteur/bac-clips.mjs`).
- **Moteur en 2 temps** (`moteur/bac-clips.mjs`) :
  1. récupère la vidéo de la plage → `source.mp4`, extrait le son → `son.mp4`, le dépose, prévient le serveur (phase « son ») ;
  2. le serveur transcrit (Groq) et choisit les moments (Claude), puis écrit `rendu.json` dans la machine ;
  3. la machine monte chaque clip à partir de `source.mp4` et des moments.
- **Aujourd'hui, en ligne, un lien YouTube n'est pas lancé** : `src/app/api/clips/route.ts` renvoie `{ erreur: "youtube" }`
  (et `src/components/clips/Studio.tsx` montre l'envoi de fichier). Ces deux garde-fous sont à retirer une fois le branchement testé.

## Ce qu'il faut brancher (le plus simple, sans toucher au montage)
Dans `telecharger()` de `moteur/bac-clips.mjs`, quand le lien est YouTube :
1. Appeler l'acteur (API Apify `run-sync-get-dataset-items`) avec `videoUrls: [lien]`,
   `startTime: plage.debut`, `endTime: plage.fin`, `quality: "720p"`, `format: "mp4"`.
2. Télécharger le `videoFileUrl` renvoyé dans `source.mp4`. Le reste du moteur ne change pas.

Coût indicatif : 0,016 $ par minute en 720p, soit ≈ 0,32 $ pour 20 min.

### Variante moins chère (optionnelle, plus de travail)
- Temps 1 : seulement le son de la plage (la vidéo de la plage en 360p, ≈ 0,16 $, ou un acteur « audio seul »).
- Temps 3 : un appel par moment choisi en 720p (0,016 $ par clip d'1 min au plus).
- Demande de passer la vidéo du moment à `fabriquer()` au lieu de `source.mp4`, avec des temps décalés au début du moment.

## Le token
- `APIFY_TOKEN` dans Vercel (Production, Sensitive), sans `NEXT_PUBLIC_`.
- La machine de montage n'a **aucune clé** (règle du projet) : soit le serveur appelle Apify et passe à la machine
  un lien de fichier temporaire (recommandé, voir `src/lib/clips-en-ligne.ts` → `lancerLot`), soit on accepte
  de passer le token à la machine (déconseillé).
- Ne jamais écrire le token dans le code : le dépôt GitHub est public.

## Avant la mise en ligne
Tester avec un compte temporaire, en ligne : lien YouTube → plage → clips sortis, notes, téléchargement,
compteur de vidéos. Prévoir le repli : si Apify échoue, message clair et envoi de fichier.
