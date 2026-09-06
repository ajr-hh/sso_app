alter table public.profiles
add column if not exists food_rules_set boolean not null default false;
alter table public.profiles
add column if not exists diet_flags text[] not null default '{}';
alter table public.profiles
add column if not exists allergens text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_diet_flags_valid;
alter table public.profiles
add constraint profiles_diet_flags_valid check (
  diet_flags <@ array[
    'vegetarian',
    'vegan',
    'nut_free',
    'dairy_free',
    'gluten_free'
  ]::text[]
);

create table if not exists public.cravings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (
    btrim(label) <> ''
    and char_length(label) <= 60
  ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create table if not exists public.craving_swaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  craving_id uuid not null references public.cravings (id),
  label text not null check (
    btrim(label) <> ''
    and char_length(label) <= 80
  ),
  favorited boolean not null default false,
  source text not null check (source in ('catalog', 'ai', 'custom')),
  rule_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('food_swaps')),
  status text not null check (
    status in ('pending', 'succeeded', 'failed')
  ),
  input jsonb not null default '{}',
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists cravings_active_user_label_idx
on public.cravings (user_id, lower(label))
where deleted = false;

create index if not exists cravings_active_user_sort_idx
on public.cravings (user_id, sort_order, id)
where deleted = false;

create unique index if not exists craving_swaps_active_craving_label_idx
on public.craving_swaps (craving_id, lower(label))
where deleted = false;

create index if not exists craving_swaps_active_craving_sort_idx
on public.craving_swaps (craving_id, favorited desc, created_at, id)
where deleted = false;

alter table public.cravings enable row level security;
alter table public.craving_swaps enable row level security;
alter table public.generation_jobs enable row level security;

drop policy if exists "Members select their active cravings"
on public.cravings;
drop policy if exists "Members select their cravings"
on public.cravings;
-- Owners must see soft-deleted rows so removal can return the updated id.
create policy "Members select their cravings"
on public.cravings for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their active cravings"
on public.cravings;
create policy "Members insert their active cravings"
on public.cravings for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

drop policy if exists "Members update their cravings"
on public.cravings;
create policy "Members update their cravings"
on public.cravings for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members select their active craving swaps"
on public.craving_swaps;
drop policy if exists "Members select their craving swaps"
on public.craving_swaps;
create policy "Members select their craving swaps"
on public.craving_swaps for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their active craving swaps"
on public.craving_swaps;
create policy "Members insert their active craving swaps"
on public.craving_swaps for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and deleted = false
  and exists (
    select 1
    from public.cravings
    where id = craving_id
      and user_id = (select auth.uid())
  )
);

drop policy if exists "Members update their craving swaps"
on public.craving_swaps;
create policy "Members update their craving swaps"
on public.craving_swaps for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members select their generation jobs"
on public.generation_jobs;
create policy "Members select their generation jobs"
on public.generation_jobs for select to authenticated
using ((select auth.uid()) = user_id);

-- Job creation goes through claim_generation_job only. A leftover insert
-- policy from an earlier apply is dropped and never recreated, so members
-- cannot write arbitrary input jsonb that would count against the hourly cap.
drop policy if exists "Members insert their pending generation jobs"
on public.generation_jobs;

revoke delete on table
  public.cravings,
  public.craving_swaps,
  public.generation_jobs
from authenticated;

revoke all on table public.cravings
from anon, public, authenticated;
grant select on table public.cravings to authenticated;
grant insert (user_id, label, sort_order)
on table public.cravings to authenticated;
grant update (label, sort_order, deleted, deleted_at)
on table public.cravings to authenticated;

revoke all on table public.craving_swaps
from anon, public, authenticated;
grant select on table public.craving_swaps to authenticated;
grant insert (user_id, craving_id, label, favorited, source, rule_tags)
on table public.craving_swaps to authenticated;
grant update (favorited, deleted, deleted_at)
on table public.craving_swaps to authenticated;

revoke all on table public.generation_jobs
from anon, public, authenticated;
grant select on table public.generation_jobs to authenticated;
revoke insert on table public.generation_jobs from authenticated;
revoke update on table public.generation_jobs from authenticated;

revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  age,
  phone,
  why_matters,
  motivators,
  coach_style,
  rail_order,
  food_rules_set,
  diet_flags,
  allergens
) on table public.profiles to authenticated;

-- Rate limit and job creation in one transaction. Counting from the client and
-- then inserting lets parallel invocations each read a count below the cap and
-- all insert, so the cap is enforced here instead: an advisory lock serializes
-- the member's own claims, and the cap is a server-side constant no caller can
-- raise. Returns null when the member is already at the cap.
--
-- The job input is built from scalar counts, not caller JSON, so a craving
-- label or allergen string cannot reach generation_jobs.input on this path.
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

  if job_kind is null or job_kind not in ('food_swaps') then
    raise exception 'unsupported generation kind' using errcode = '22023';
  end if;

  -- Held until commit and scoped to this member, so one member's burst never
  -- blocks another member's claim.
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
