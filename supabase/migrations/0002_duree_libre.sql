-- =====================================================================
-- LootClip : durée choisie par le joueur (30 s à 3 min) et 1 à 10 clips.
-- À coller dans Supabase > SQL Editor > New query > Run. Peut être relancé.
-- =====================================================================

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

  if jsonb_typeof(p_clips) <> 'array' or jsonb_array_length(p_clips) not between 1 and 10 then
    raise exception 'nombre_de_clips';
  end if;

  if p_duree is null or p_duree not between 10 and 180 then
    raise exception 'duree_invalide';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_clips) c
    where coalesce(c ->> 'chemin', '') not like v_uid::text || '/%'
  ) then
    raise exception 'clip_invalide';
  end if;

  insert into public.montages (user_id, style, clips, duree, accroche, titre, legende, hashtags, filigrane, source_id)
  values (v_uid, p_style, p_clips, p_duree, left(p_accroche, 120), left(p_titre, 120), left(p_legende, 300), coalesce(p_hashtags, '{}'), v_offre = 'gratuit', p_source)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.creer_montage(text, jsonb, integer, text, text, text, text[], uuid) from public, anon;
grant execute on function public.creer_montage(text, jsonb, integer, text, text, text, text[], uuid) to authenticated;
