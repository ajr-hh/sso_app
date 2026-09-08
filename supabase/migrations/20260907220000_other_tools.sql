create table if not exists public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration_days integer not null default 30 check (duration_days > 0 and duration_days <= 365),
  buy_in integer not null default 20 check (buy_in >= 0 and buy_in <= 1000),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists group_challenges_user_id_idx
on public.group_challenges (user_id);

alter table public.group_challenges enable row level security;

create policy "Members select their group challenges"
on public.group_challenges for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members insert their group challenges"
on public.group_challenges for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.group_challenges from authenticated;
revoke all on table public.group_challenges from anon, public, authenticated;
grant select on table public.group_challenges to authenticated;
grant insert (user_id, duration_days, buy_in)
on table public.group_challenges to authenticated;

create table if not exists public.group_challenge_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null references public.group_challenges (id) on delete cascade,
  email text not null check (btrim(email) <> '' and char_length(email) <= 320),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists group_challenge_invites_user_id_idx
on public.group_challenge_invites (user_id);

alter table public.group_challenge_invites enable row level security;

create policy "Members select their challenge invites"
on public.group_challenge_invites for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members insert their challenge invites"
on public.group_challenge_invites for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.group_challenge_invites from authenticated;
revoke all on table public.group_challenge_invites
from anon, public, authenticated;
grant select on table public.group_challenge_invites to authenticated;
grant insert (user_id, challenge_id, email)
on table public.group_challenge_invites to authenticated;

create table if not exists public.favorite_restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> '' and char_length(name) <= 80),
  best_pick text not null check (btrim(best_pick) <> '' and char_length(best_pick) <= 160),
  filter text not null default '' check (char_length(filter) <= 120),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists favorite_restaurants_user_id_idx
on public.favorite_restaurants (user_id);

alter table public.favorite_restaurants enable row level security;

create policy "Members select their favorite restaurants"
on public.favorite_restaurants for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members insert their favorite restaurants"
on public.favorite_restaurants for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.favorite_restaurants from authenticated;
revoke all on table public.favorite_restaurants from anon, public, authenticated;
grant select on table public.favorite_restaurants to authenticated;
grant insert (user_id, name, best_pick, filter)
on table public.favorite_restaurants to authenticated;

create table if not exists public.restaurant_targets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  protein_grams integer not null default 40 check (protein_grams > 0 and protein_grams <= 300),
  calorie_max integer not null default 700 check (calorie_max > 0 and calorie_max <= 5000)
);

alter table public.restaurant_targets enable row level security;

create policy "Members select their restaurant targets"
on public.restaurant_targets for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members upsert their restaurant targets"
on public.restaurant_targets for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members update their restaurant targets"
on public.restaurant_targets for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke delete on table public.restaurant_targets from authenticated;
revoke all on table public.restaurant_targets from anon, public, authenticated;
grant select on table public.restaurant_targets to authenticated;
grant insert (user_id, protein_grams, calorie_max)
on table public.restaurant_targets to authenticated;
grant update (protein_grams, calorie_max)
on table public.restaurant_targets to authenticated;

create table if not exists public.food_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  craving text not null check (btrim(craving) <> '' and char_length(craving) <= 80),
  flex_level text not null check (flex_level in ('A little better', 'Mid', 'Very healthy')),
  title text not null check (btrim(title) <> '' and char_length(title) <= 80),
  sub text not null check (btrim(sub) <> '' and char_length(sub) <= 160),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists food_aliases_user_id_idx
on public.food_aliases (user_id);

alter table public.food_aliases enable row level security;

create policy "Members select their food aliases"
on public.food_aliases for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Members insert their food aliases"
on public.food_aliases for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.food_aliases from authenticated;
revoke all on table public.food_aliases from anon, public, authenticated;
grant select on table public.food_aliases to authenticated;
grant insert (user_id, craving, flex_level, title, sub)
on table public.food_aliases to authenticated;

alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions', 'menu_scan', 'food_alias'));

create or replace function public.claim_generation_job(
  job_kind text,
  diet_flag_count integer,
  allergen_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_per_hour constant integer := 10;
  owner_id uuid := (select auth.uid());
  recent_count integer;
  new_job_id uuid;
begin
  if owner_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions', 'menu_scan', 'food_alias') then
    raise exception 'unsupported generation kind' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('public.claim_generation_job'),
    pg_catalog.hashtext(owner_id::text)
  );

  select count(*)
  into recent_count
  from public.generation_jobs
  where user_id = owner_id
    and created_at >= pg_catalog.now() - interval '1 hour';

  if recent_count >= max_per_hour then
    return null;
  end if;

  insert into public.generation_jobs (user_id, kind, status, input)
  values (
    owner_id,
    job_kind,
    'pending',
    pg_catalog.jsonb_build_object(
      'diet_flag_count', greatest(coalesce(diet_flag_count, 0), 0),
      'allergen_count', greatest(coalesce(allergen_count, 0), 0)
    )
  )
  returning id into new_job_id;

  return new_job_id;
end;
$$;

revoke all on function public.claim_generation_job(text, integer, integer)
from public, anon;
grant execute on function public.claim_generation_job(text, integer, integer)
to authenticated;
