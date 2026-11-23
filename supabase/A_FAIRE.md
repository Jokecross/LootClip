# Réglages à faire dans Supabase (projet rcdysehhiweudnznqfkv)

## 1. Créer les tables (2 minutes)
SQL Editor > New query > coller tout `supabase/migrations/0001_lootclip.sql` > Run.
Le script peut être relancé sans risque.

## 2. Connexion directe, sans vérification par e-mail
Authentication > Sign In / Providers > Email > désactiver **Confirm email** > Save.
Sans ça, l'inscription demande de cliquer un lien reçu par e-mail.

## 3. Google (quand tu veux)
Authentication > Sign In / Providers > Google : coller l'identifiant et le secret d'un client OAuth Google
(Google Cloud Console > APIs & Services > Credentials). Le bouton de l'appli s'active tout seul ensuite.
Dans URL Configuration, autoriser `http://localhost:3220/**` et l'adresse du site en ligne.

## 4. Taille des clips
Storage > Settings > Upload file size limit.
En offre gratuite, Supabase bloque à **50 Mo par fichier** : un clip PS5 de 1 à 3 minutes dépasse souvent.
Il faut l'offre Pro pour monter la limite (1 Go conseillé).

## 5. Avant d'ouvrir au public
- **Mot de passe oublié** : il faudra envoyer un e-mail de réinitialisation, donc brancher un SMTP (Resend)
  dans Authentication > Emails > SMTP Settings.

## Pour tester un paiement en attendant Stripe
Le paiement de l'appli est simulé et la base refuse que le téléphone change l'offre.
Pour tester Pro : Table Editor > profils > colonne `offre` = `pro` sur ta ligne.
