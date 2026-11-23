# XPclip

SaaS mobile-first en français : les captures GTA 6 d'un joueur console deviennent des vidéos 9:16 de plus d'une minute pour TikTok, avec le suivi de sa progression vers la monétisation.

## Lancer
- `npm run dev` : port 3220, ouvert sur le Wi-Fi (`ipconfig getifaddr en0` pour tester sur le téléphone).
- `npm run typecheck`, `npm run build`.

## Où sont les choses
- Landing : `src/app/page.tsx` + `src/components/landing/`. Onboarding 8 écrans : `src/app/commencer/`. Tarifs : `src/app/tarifs/` + `src/components/tarifs/`.
- Appli : `src/app/app/` (creer, video/[id], videos, progression, compte, demarrage = tutoriel).
- Réglages chiffrés (offres, limites, taux, seuils, mentions) : `src/lib/config.ts` uniquement.
- Illustrations originales en SVG : `src/components/illus/Illus.tsx` (emplacements d'image remplaçables).
- Backend simulé : `src/lib/etat.ts`, `depot.ts`, `montage.ts`, `abonnement.ts`. Plan dans `docs/branchement.md`.

## Règles de marque (non négociables)
- Couleurs de la charte seulement (tokens dans `globals.css`). Dégradé réservé au hero, aux boutons principaux et au logo.
- Titres Bricolage Grotesque 800, interlignage 1 ; texte DM Sans.
- Tutoiement, phrases de 12 mots maximum, aucun emoji.
- Aucun logo, typo, personnage ou visuel de GTA ou de Rockstar. « GTA 6 » seulement dans les textes.
- XPclip fait des clips, point : aucune mention des règles de monétisation TikTok (seuils, programme de récompenses). Pas de voix off ni de sous-titres en v1, seulement l'accroche écrite.
- Le montant de l'onboarding et de l'écran des offres est toujours un « objectif » : jamais « estimation », « tu vas gagner », « gains prévus » ni « revenu estimé » à côté.
- Pas d'essai gratuit (décision du 23/11/2026) : l'écran des offres (`Paywall`) s'affiche après l'onboarding, et bloque l'appli sans abonnement.
- Zones tactiles de 48 px minimum, colonne de 480 px max dans l'appli.
