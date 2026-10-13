-- Neo Rush · Infinito and daily challenge rankings (Supabase project "neo-rush").
-- Applied as the migrations endless_ranking, endless_ranking_name_filter_fix and
-- daily_ranking; this file is the resulting schema, kept to rebuild or review it.
--
-- Infinito: one row per device (player_id, a random id the game stores locally),
-- keeping its best run. Daily challenge: one row per device and local day. The
-- tables are closed to the API; the game only calls the functions below, with
-- the project's publishable key.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.endless_scores (
  player_id uuid primary key,
  name text not null,
  score integer not null check (score >= 0),
  stage integer not null check (stage between 1 and 10000),
  seconds real not null check (seconds >= 0),
  skin text not null default 'classic',
  plays integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_submit timestamptz not null default now()
);
create index endless_scores_rank on public.endless_scores (score desc, updated_at asc);
alter table public.endless_scores enable row level security;
revoke all on public.endless_scores from anon, authenticated;

-- Same rules as src/core/names.ts: 3-16 letters, digits, spaces, . _ -; no insults.
create or replace function private.clean_name(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  clean text := regexp_replace(btrim(coalesce(raw, '')), '\s+', ' ', 'g');
  folded text;
  banned text[] := array[
    'puta', 'puto', 'mierda', 'verga', 'pendej', 'culer', 'marica', 'maricon', 'joto',
    'cabron', 'chinga', 'pinga', 'polla', 'zorra', 'malparid', 'hijueputa',
    'gonorrea', 'cerote', 'mamaguevo', 'mamahuevo', 'huevon', 'idiota', 'imbecil', 'estupid',
    'fuck', 'shit', 'bitch', 'nigg', 'nazi', 'hitler', 'porn', 'sexo', 'vagina', 'violad'
  ];
  word text;
begin
  if char_length(clean) < 3 or char_length(clean) > 16 then return null; end if;
  if clean !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ._-]+$' then return null; end if;
  -- Accents and look-alike digits fold to plain letters before the word check.
  folded := translate(lower(clean), 'áéíóúüñ013457', 'aeiouunoieast');
  folded := regexp_replace(folded, '[^a-z]', '', 'g');
  foreach word in array banned loop
    if position(word in folded) > 0 then return null; end if;
  end loop;
  return clean;
end;
$$;

create or replace function private.rank_of(p_player uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select 1 + count(*)
  from public.endless_scores other, public.endless_scores me
  where me.player_id = p_player
    and (other.score > me.score or (other.score = me.score and other.updated_at < me.updated_at));
$$;

create or replace function public.submit_endless(
  p_player uuid, p_name text, p_score integer, p_stage integer, p_seconds real, p_skin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := private.clean_name(p_name);
  previous public.endless_scores%rowtype;
  row public.endless_scores%rowtype;
begin
  if clean is null then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  -- Plausibility: at most four platforms per song second, each under 1,600 points,
  -- and one stage every 16 seconds.
  if p_player is null or p_score is null or p_stage is null or p_seconds is null
    or p_score < 0 or p_stage < 1 or p_seconds < 0 or p_seconds > 86400
    or p_score > 6500 * p_seconds + 2000 or p_stage > floor(p_seconds / 16) + 1 then
    raise exception 'invalid_run' using errcode = '22023';
  end if;
  select * into previous from public.endless_scores where player_id = p_player for update;
  if found and previous.last_submit > now() - interval '3 seconds' then
    raise exception 'too_fast' using errcode = '22023';
  end if;
  insert into public.endless_scores as s (player_id, name, score, stage, seconds, skin)
  values (p_player, clean, p_score, p_stage, p_seconds, left(coalesce(nullif(p_skin, ''), 'classic'), 24))
  on conflict (player_id) do update set
    name = excluded.name,
    plays = s.plays + 1,
    last_submit = now(),
    score = greatest(s.score, excluded.score),
    stage = case when excluded.score > s.score then excluded.stage else s.stage end,
    seconds = case when excluded.score > s.score then excluded.seconds else s.seconds end,
    skin = case when excluded.score > s.score then excluded.skin else s.skin end,
    updated_at = case when excluded.score > s.score then now() else s.updated_at end
  returning * into row;
  return jsonb_build_object(
    'name', row.name,
    'best', row.score,
    'stage', row.stage,
    'improved', previous.player_id is null or p_score > previous.score,
    'rank', private.rank_of(p_player),
    'total', (select count(*) from public.endless_scores)
  );
end;
$$;

-- Top of the list plus your own position. Never exposes other players' ids.
create or replace function public.endless_board(p_player uuid, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select player_id, name, score, stage, skin,
      row_number() over (order by score desc, updated_at asc) as rank
    from public.endless_scores
  )
  select jsonb_build_object(
    'total', (select count(*) from ranked),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', rank, 'name', name, 'score', score, 'stage', stage, 'skin', skin,
        'me', player_id = p_player) order by rank)
      from ranked where rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object('rank', rank, 'name', name, 'score', score, 'stage', stage)
      from ranked where player_id = p_player
    )
  );
$$;

-- Daily challenge: one list per local day, one row per device and day.
create table public.daily_scores (
  day date not null,
  player_id uuid not null,
  name text not null,
  score integer not null check (score >= 0),
  stage integer not null check (stage between 1 and 10000),
  seconds real not null check (seconds >= 0),
  skin text not null default 'classic',
  plays integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_submit timestamptz not null default now(),
  primary key (day, player_id)
);
create index daily_scores_rank on public.daily_scores (day, score desc, updated_at asc);
alter table public.daily_scores enable row level security;
revoke all on public.daily_scores from anon, authenticated;

create or replace function private.daily_rank_of(p_player uuid, p_day date)
returns bigint
language sql
stable
set search_path = ''
as $$
  select 1 + count(*)
  from public.daily_scores other, public.daily_scores me
  where me.player_id = p_player and me.day = p_day and other.day = p_day
    and (other.score > me.score or (other.score = me.score and other.updated_at < me.updated_at));
$$;

-- The day is the player's local date: it must be within one day of the server's UTC date.
create or replace function public.submit_daily(
  p_player uuid, p_day date, p_name text, p_score integer, p_stage integer, p_seconds real, p_skin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := private.clean_name(p_name);
  today date := (now() at time zone 'utc')::date;
  previous public.daily_scores%rowtype;
  row public.daily_scores%rowtype;
begin
  if clean is null then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if p_player is null or p_day is null or p_score is null or p_stage is null or p_seconds is null
    or p_day < today - 1 or p_day > today + 1
    or p_score < 0 or p_stage < 1 or p_seconds < 0 or p_seconds > 86400
    or p_score > 6500 * p_seconds + 2000 or p_stage > floor(p_seconds / 16) + 1 then
    raise exception 'invalid_run' using errcode = '22023';
  end if;
  select * into previous from public.daily_scores where day = p_day and player_id = p_player for update;
  if found and previous.last_submit > now() - interval '3 seconds' then
    raise exception 'too_fast' using errcode = '22023';
  end if;
  insert into public.daily_scores as s (day, player_id, name, score, stage, seconds, skin)
  values (p_day, p_player, clean, p_score, p_stage, p_seconds, left(coalesce(nullif(p_skin, ''), 'classic'), 24))
  on conflict (day, player_id) do update set
    name = excluded.name,
    plays = s.plays + 1,
    last_submit = now(),
    score = greatest(s.score, excluded.score),
    stage = case when excluded.score > s.score then excluded.stage else s.stage end,
    seconds = case when excluded.score > s.score then excluded.seconds else s.seconds end,
    skin = case when excluded.score > s.score then excluded.skin else s.skin end,
    updated_at = case when excluded.score > s.score then now() else s.updated_at end
  returning * into row;
  return jsonb_build_object(
    'name', row.name,
    'best', row.score,
    'stage', row.stage,
    'improved', previous.player_id is null or p_score > previous.score,
    'rank', private.daily_rank_of(p_player, p_day),
    'total', (select count(*) from public.daily_scores where day = p_day)
  );
end;
$$;

create or replace function public.daily_board(p_player uuid, p_day date, p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select player_id, name, score, stage, skin,
      row_number() over (order by score desc, updated_at asc) as rank
    from public.daily_scores
    where day = p_day
  )
  select jsonb_build_object(
    'total', (select count(*) from ranked),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', rank, 'name', name, 'score', score, 'stage', stage, 'skin', skin,
        'me', player_id = p_player) order by rank)
      from ranked where rank <= least(greatest(coalesce(p_limit, 50), 1), 100)
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object('rank', rank, 'name', name, 'score', score, 'stage', stage)
      from ranked where player_id = p_player
    )
  );
$$;

-- One name per player: renaming updates Infinito and every daily list. The name
-- is checked the same way; a player not listed yet only gets it checked.
create or replace function public.rename_endless(p_player uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := private.clean_name(p_name);
  listed boolean;
begin
  if clean is null then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  update public.endless_scores set name = clean where player_id = p_player;
  listed := found;
  update public.daily_scores set name = clean where player_id = p_player;
  return jsonb_build_object('name', clean, 'listed', listed or found);
end;
$$;

revoke all on function private.clean_name(text) from public, anon, authenticated;
revoke all on function private.rank_of(uuid) from public, anon, authenticated;
revoke all on function private.daily_rank_of(uuid, date) from public, anon, authenticated;
revoke all on function public.submit_daily(uuid, date, text, integer, integer, real, text) from public;
revoke all on function public.daily_board(uuid, date, integer) from public;
grant execute on function public.submit_daily(uuid, date, text, integer, integer, real, text) to anon, authenticated;
grant execute on function public.daily_board(uuid, date, integer) to anon, authenticated;
revoke all on function public.submit_endless(uuid, text, integer, integer, real, text) from public;
revoke all on function public.rename_endless(uuid, text) from public;
revoke all on function public.endless_board(uuid, integer) from public;
grant execute on function public.submit_endless(uuid, text, integer, integer, real, text) to anon, authenticated;
grant execute on function public.rename_endless(uuid, text) to anon, authenticated;
grant execute on function public.endless_board(uuid, integer) to anon, authenticated;

-- Moderation, from the Supabase SQL editor:
--   select name, score, stage, updated_at from public.endless_scores order by score desc;
--   delete from public.endless_scores where name = 'Nombre a quitar';
--   select name, score, stage from public.daily_scores where day = current_date order by score desc;
--   delete from public.daily_scores where name = 'Nombre a quitar';
