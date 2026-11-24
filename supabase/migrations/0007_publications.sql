-- =====================================================================
-- XPclip : comptes TikTok / Instagram reliés, et publications programmées.
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé.
-- Le téléphone lit ses lignes, seul le serveur écrit.
-- =====================================================================

create table if not exists public.comptes_sociaux (
  id text primary key,                       -- identifiant chez Post for Me
  user_id uuid not null references auth.users (id) on delete cascade,
  reseau text not null check (reseau in ('tiktok', 'instagram')),
  pseudo text,
  photo text,
  actif boolean not null default true,       -- false : à reconnecter
  maj_le timestamptz not null default now(),
  cree_le timestamptz not null default now()
);
create index if not exists comptes_sociaux_user_idx on public.comptes_sociaux (user_id);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  montage_id uuid not null references public.montages (id) on delete cascade,
  reseau text not null check (reseau in ('tiktok', 'instagram')),
  compte_id text not null,
  pseudo text,
  texte text not null default '',
  options jsonb not null default '{}'::jsonb,
  statut text not null default 'envoi' check (statut in ('envoi', 'programmee', 'en_cours', 'publiee', 'echouee', 'annulee')),
  prevu_le timestamptz,                      -- vide : tout de suite
  pfm_id text,
  lien text,
  erreur text,
  verifie_le timestamptz,
  cree_le timestamptz not null default now()
);
create index if not exists publications_user_idx on public.publications (user_id, cree_le desc);
-- Une vidéo ne part qu'une fois par réseau, sauf après un échec ou une annulation.
create unique index if not exists publications_une_fois on public.publications (montage_id, reseau)
  where statut in ('envoi', 'programmee', 'en_cours', 'publiee');

alter table public.comptes_sociaux enable row level security;
alter table public.publications enable row level security;
revoke all on public.comptes_sociaux, public.publications from anon, authenticated;
grant select on public.comptes_sociaux, public.publications to authenticated;

drop policy if exists "comptes sociaux : lire les siens" on public.comptes_sociaux;
create policy "comptes sociaux : lire les siens" on public.comptes_sociaux
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "publications : lire les siennes" on public.publications;
create policy "publications : lire les siennes" on public.publications
  for select to authenticated using ((select auth.uid()) = user_id);
