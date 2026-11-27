# XPclip

SaaS mobile-first en français : on colle le lien d'une vidéo (YouTube, Twitch, Kick, X) ou on dépose un fichier, XPclip trouve les meilleurs moments et les monte en clips verticaux 9:16 sous-titrés pour TikTok, Shorts et Reels (pivot du 26/11/2026 ; l'ancienne version montait les captures GTA 6 d'un joueur console). Cible : streamers, créateurs, podcasteurs, clippeurs.

## Lancer
- `npm run dev` : port 3220, ouvert sur le Wi-Fi (`ipconfig getifaddr en0` pour tester sur le téléphone).
- `npm run typecheck`, `npm run build`.

## Où sont les choses
- Landing V6 « look outil » : `src/app/page.tsx` + `lp.css` + `src/components/accueil/` (`ChampLien`, `Interface`, `Reglages`, `SousTitres`). Onboarding 13 écrans : `src/app/commencer/` + `src/components/onboarding/` (`Cadre`). Appli : style commun `src/app/app/outil.css`. Tarifs : `src/app/tarifs/` + `src/components/tarifs/`.
- Appli : `src/app/app/` (creer = studio « lien → clips » plein écran, videos = Mes clips, video/[id], compte, demarrage = tutoriel).
- Lien → clips : moteur `moteur/url.mjs` + `moteur/clip*`, studio `src/components/clips/`, serveur `src/lib/clips-*.ts` + `src/app/api/clips/`. Tout est expliqué dans `docs/lien-clips.md`.
- Réglages chiffrés (offres, limites, taux, seuils, mentions) : `src/lib/config.ts` uniquement.
- Illustrations originales en SVG : `src/components/illus/Illus.tsx` (emplacements d'image remplaçables).
- Backend simulé : `src/lib/etat.ts`, `depot.ts`, `montage.ts`, `abonnement.ts`. Plan dans `docs/branchement.md`.

## Règles de marque (non négociables)
- Look outil (décision du 26/11/2026) : pas de robot, manette, pièces, nuages ni barre d'XP. Ça doit faire SaaS de clipping.
- Couleurs de la charte seulement (tokens dans `globals.css`). Dégradé réservé au hero, aux boutons principaux et au logo.
- Titres Bricolage Grotesque 800, interlignage 1 ; texte DM Sans.
- Tutoiement, phrases de 12 mots maximum, aucun emoji.
- Aucun logo, typo, personnage ou visuel de GTA ou de Rockstar. Exception décidée par Martin (25/11/2026) : de vrais montages XPclip de ses parties (`public/v4/clips`), jamais de bande-annonce ni de cinématique.
- Visuels du site : uniquement les vidéos de Martin et nos dessins. Jamais de clips tirés de vidéos de tiers (droits d'auteur), même générés par notre moteur. Exception décidée par Martin le 26/11/2026, malgré l'avertissement sur les droits : la démo MichouGaming (`public/v4/demo`, `src/components/onboarding/demo.ts`) sur la landing et l'onboarding. Retour aux clips de Martin : `~/.xpclip-modeles/demo-michou/demo-martin.ts`.
- XPclip fait des clips, point : aucune mention des règles de monétisation TikTok (seuils, programme de récompenses).
- Les sous-titres mot à mot sont le cœur du produit (réglables : type de clip, couleur, placement, format), avec l'accroche écrite. Pas de voix off.
- Le montant de l'onboarding et de l'écran des offres est toujours un « objectif » : jamais « estimation », « tu vas gagner », « gains prévus » ni « revenu estimé » à côté.
- Pas d'essai gratuit (décision du 23/11/2026) : l'écran des offres (`Paywall`) s'affiche après l'onboarding, et bloque l'appli sans abonnement.
- Zones tactiles de 48 px minimum, colonne de 480 px max dans l'appli.
