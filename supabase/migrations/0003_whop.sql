-- =====================================================================
-- XPclip : abonnements Whop.
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé.
-- =====================================================================

alter table public.profils add column if not exists whop_abonnement text;   -- mem_…, l'abonnement Whop actif
alter table public.profils add column if not exists abonnement_fin timestamptz; -- rempli quand le joueur a résilié : fin de l'accès

create index if not exists profils_whop_idx on public.profils (whop_abonnement) where whop_abonnement is not null;

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
    new.whop_abonnement := old.whop_abonnement;
    new.abonnement_fin := old.abonnement_fin;
    new.email := old.email;
    new.cree_le := old.cree_le;
  end if;
  return new;
end;
$$;
