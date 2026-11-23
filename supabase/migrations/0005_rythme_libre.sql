-- =====================================================================
-- XPclip : le rythme vient des heures de jeu, il n'est plus limité à 3, 7 ou 14 vidéos par semaine.
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé.
-- =====================================================================
alter table public.profils drop constraint if exists profils_frequence_check;
alter table public.profils add constraint profils_frequence_check check (frequence between 1 and 21);
