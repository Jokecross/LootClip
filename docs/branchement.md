# Brancher le vrai backend

Aujourd'hui, tout est simulé dans le navigateur (`src/lib/etat.ts`, localStorage).
Chaque fichier simulé dit en tête ce qui le remplacera. Ordre conseillé :

## 1. Supabase : comptes, base, stockage
- Auth : lien magique par e-mail + Google. Remplace `creer()` dans `src/app/inscription/page.tsx`.
- Tables : `profils` (offre, plateforme, tuto_vu), `videos` (statut, style, durée, textes, script),
  `clips` (chemin dans le stockage, durée, taille, `supprime_le`), `progression`, `evenements`.
- RLS : chacun ne voit que ses lignes.
- Stockage : bucket privé `clips`, envoi direct du téléphone en TUS (reprise après coupure).
  Remplace `deposer()` dans `src/lib/depot.ts`.
- Purge : tâche planifiée (pg_cron) qui supprime les clips bruts de plus de 14 jours.

## 2. Montage : file de tâches + service FFmpeg séparé
- Créer une vidéo = insérer une ligne `videos` en `en_attente`, via une fonction serveur
  qui **vérifie le quota** (1 en Gratuit, 30 par mois en Pro). Le quota affiché dans l'appli n'est qu'indicatif.
- Le service de montage (machine avec FFmpeg : Fly.io, Railway ou Render) prend les tâches
  `en_attente`, passe en `en_cours`, puis `termine` ou `echoue`.
- Étapes : détection des meilleurs passages (volume, mouvement), découpe, recadrage 9:16,
  accroche dans les 2 premières secondes, sous-titres incrustés, voix off (synthèse vocale
  à partir du script), filigrane si Gratuit, export 1080 × 1920 en H.264.
- Fin de montage : notification push (Web Push) + statut en temps réel (Supabase Realtime).
- Remplace `lancerMontage()` et `statutDe()` dans `src/lib/montage.ts`.

## 3. Whop (branché)
- Offres et tarifs créés par `node outils/whop-offres.mjs` (masqués chez Whop), identifiants dans `src/lib/whop-tarifs.json`.
- `src/lib/whop.ts` : commande, synchronisation de l'abonnement, factures, signature. Le prix est choisi côté serveur.
- Paiement affiché dans la page : `src/components/app/Paiement.tsx`. Retour de vérification bancaire : `/app/merci`.
- Webhook : `https://www.xpclip.com/api/whop` (membership.activated, membership.updated, payment.succeeded, refund.created, refund.updated).
- Variables Vercel : `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, `WHOP_TESTEURS` (e-mails), puis `PAIEMENT_OUVERT=1` pour ouvrir à tous.
- Changer un prix : modifier `src/lib/config.ts` demande de nouveaux tarifs Whop (les abonnés gardent le leur).
- Sans filigrane après achat : `/api/montage/sans-filigrane` refait la même vidéo, hors quota.

## Rappel du lendemain
- Onboarding, réponse « Non » à « Tu as déjà des clips ? » : on enregistre `rappel_le = maintenant + 24 h`.
- Tâche planifiée : si aucun clip n'est déposé à cette heure, envoi d'une notification Web Push.
  En démo, le rappel s'affiche à la prochaine ouverture de l'appli (`src/app/app/layout.tsx`).

## 4. Mesure des conversions
- `src/lib/suivi.ts` pousse déjà `onboarding_ecran` (chaque écran), `inscription`, `premiere_video`, `paywall_affiche`,
  `offre_choisie`, `paiement_reussi` et `partage_tiktok` dans `window.dataLayer`.
- Brancher l'outil choisi (Plausible, PostHog, GTM) et écrire aussi dans la table `evenements`.
