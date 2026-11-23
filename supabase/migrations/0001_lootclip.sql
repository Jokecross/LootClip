-- =====================================================================
-- LootClip : schéma initial
-- À coller tel quel dans Supabase > SQL Editor > New query > Run.
-- Peut être relancé sans casse (tout est en « if not exists » / « or replace »).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Profils : un par compte, créé automatiquement à l'inscription
-- ---------------------------------------------------------------------
create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  -- Réponses de l'onboarding
  plateforme text not null default 'ps5' check (plateforme in ('ps5', 'xbox')),
  objectif integer check (objectif between 10 and 100000),
  tiktok text check (tiktok in ('abonnes', 'vide', 'non')),
  frequence integer check (frequence in (3, 7, 14)),
  -- Parcours
  tuto_vu boolean not null default false,
  defi_debut timestamptz,
  rappel_le timestamptz,
  rappel_fait boolean not null default false,
  -- Abonnement : écrit seulement par le serveur (webhook Stripe), jamais par le téléphone
  offre text not null default 'gratuit' check (offre in ('gratuit', 'starter', 'pro', 'max')),
  periodicite text check (periodicite in ('mensuel', 'annuel')),
  abonne_depuis timestamptz,
  remise_lancement boolean not null default false,
  stripe_customer_id text,
  cree_le timestamptz not null default now()
);

alter table public.profils enable row level security;

drop policy if exists "profils : lire le sien" on public.profils;
create policy "profils : lire le sien" on public.profils
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profils : modifier le sien" on public.profils;
create policy "profils : modifier le sien" on public.profils
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Le téléphone ne peut pas toucher à l'abonnement, même en trafiquant la requête.
create or replace function public.proteger_abonnement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.offre := old.offre;
    new.periodicite := old.periodicite;
    new.abonne_depuis := old.abonne_depuis;
    new.remise_lancement := old.remise_lancement;
    new.stripe_customer_id := old.stripe_customer_id;
    new.email := old.email;
    new.cree_le := old.cree_le;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_abonnement on public.profils;
create trigger proteger_abonnement
  before update on public.profils
  for each row execute function public.proteger_abonnement();

-- Création du profil à l'inscription
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profils (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists creer_profil on auth.users;
create trigger creer_profil
  after insert on auth.users
  for each row execute function public.creer_profil();

-- ---------------------------------------------------------------------
-- 2. Montages : la file de tâches lue par le service de montage (FFmpeg)
-- ---------------------------------------------------------------------
create table if not exists public.montages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  style text not null check (style in ('defi', 'mission', 'drole')),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'termine', 'echoue')),
  etape smallint not null default 0,
  avancement real not null default 0,
  -- [{ "chemin": "<user_id>/<fichier>", "nom": "...", "duree": 42, "taille": 123 }]
  clips jsonb not null default '[]'::jsonb,
  duree integer,
  accroche text,
  titre text,
  legende text,
  hashtags text[] not null default '{}',
  filigrane boolean not null default true,
  video_chemin text,
  erreur text,
  partagee_le timestamptz,
  source_id uuid references public.montages (id) on delete set null,
  pris_par text,
  cree_le timestamptz not null default now(),
  debut_le timestamptz,
  termine_le timestamptz
);

create index if not exists montages_user_idx on public.montages (user_id, cree_le desc);
create index if not exists montages_file_idx on public.montages (cree_le) where statut = 'en_attente';

alter table public.montages enable row level security;

drop policy if exists "montages : lire les siens" on public.montages;
create policy "montages : lire les siens" on public.montages
  for select to authenticated using ((select auth.uid()) = user_id);
-- Pas d'insertion ni de modification directe : tout passe par les fonctions ci-dessous.

-- Création d'un montage, avec le quota vérifié ici (1 en Gratuit, 20/60/200 par mois sinon).
create or replace function public.creer_montage(
  p_style text,
  p_clips jsonb,
  p_duree integer,
  p_accroche text,
  p_titre text,
  p_legende text,
  p_hashtags text[],
  p_source uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_offre text;
  v_limite integer;
  v_utilise integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'non_connecte';
  end if;

  -- Un seul montage créé à la fois par compte : pas de double clic qui contourne le quota.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select offre into v_offre from public.profils where id = v_uid;
  v_offre := coalesce(v_offre, 'gratuit');
  v_limite := case v_offre when 'starter' then 20 when 'pro' then 60 when 'max' then 200 else 1 end;

  if v_offre = 'gratuit' then
    select count(*) into v_utilise from public.montages
      where user_id = v_uid and statut <> 'echoue';
  else
    select count(*) into v_utilise from public.montages
      where user_id = v_uid and statut <> 'echoue' and cree_le >= date_trunc('month', now());
  end if;

  if v_utilise >= v_limite then
    raise exception 'quota_atteint';
  end if;

  if v_offre = 'starter' and p_style = 'mission' then
    raise exception 'style_ferme';
  end if;

  if jsonb_typeof(p_clips) <> 'array' or jsonb_array_length(p_clips) not between 3 and 10 then
    raise exception 'nombre_de_clips';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_clips) c
    where coalesce(c ->> 'chemin', '') not like v_uid::text || '/%'
  ) then
    raise exception 'clip_invalide';
  end if;

  insert into public.montages (user_id, style, clips, duree, accroche, titre, legende, hashtags, filigrane, source_id)
  values (v_uid, p_style, p_clips, p_duree, p_accroche, p_titre, p_legende, coalesce(p_hashtags, '{}'), v_offre = 'gratuit', p_source)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.creer_montage(text, jsonb, integer, text, text, text, text[], uuid) from public, anon;
grant execute on function public.creer_montage(text, jsonb, integer, text, text, text, text[], uuid) to authenticated;

-- « Partager sur TikTok » : marque la vidéo et lance le défi des 7 jours.
create or replace function public.marquer_partagee(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.montages set partagee_le = coalesce(partagee_le, now())
    where id = p_id and user_id = auth.uid();
  update public.profils set defi_debut = coalesce(defi_debut, now())
    where id = auth.uid();
end;
$$;

revoke all on function public.marquer_partagee(uuid) from public, anon;
grant execute on function public.marquer_partagee(uuid) to authenticated;

-- L'appli suit l'avancement des montages en direct.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'montages'
  ) then
    alter publication supabase_realtime add table public.montages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Factures (remplies par le webhook Stripe)
-- ---------------------------------------------------------------------
create table if not exists public.factures (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  montant numeric(10, 2) not null,
  libelle text not null,
  le timestamptz not null default now()
);

alter table public.factures enable row level security;

drop policy if exists "factures : lire les siennes" on public.factures;
create policy "factures : lire les siennes" on public.factures
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 4. Suivi : écrans de l'onboarding, inscription, première vidéo, paywall, paiement
-- ---------------------------------------------------------------------
create table if not exists public.evenements (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  nom text not null check (char_length(nom) <= 40),
  details jsonb not null default '{}'::jsonb,
  le timestamptz not null default now()
);

alter table public.evenements enable row level security;

drop policy if exists "evenements : écrire" on public.evenements;
create policy "evenements : écrire" on public.evenements
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 5. Suppression du compte (les fichiers sont effacés avant, par l'appli)
-- ---------------------------------------------------------------------
create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- ---------------------------------------------------------------------
-- 6. Stockage : clips bruts et vidéos finies, chacun dans son dossier
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clips', 'clips', false, 1073741824, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']),
  ('videos', 'videos', false, null, array['video/mp4'])
on conflict (id) do nothing;

drop policy if exists "clips : déposer les siens" on storage.objects;
create policy "clips : déposer les siens" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "clips : lire les siens" on storage.objects;
create policy "clips : lire les siens" on storage.objects
  for select to authenticated
  using (bucket_id in ('clips', 'videos') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "clips : reprendre l'envoi" on storage.objects;
create policy "clips : reprendre l'envoi" on storage.objects
  for update to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fichiers : supprimer les siens" on storage.objects;
create policy "fichiers : supprimer les siens" on storage.objects
  for delete to authenticated
  using (bucket_id in ('clips', 'videos') and (storage.foldername(name))[1] = (select auth.uid())::text);
