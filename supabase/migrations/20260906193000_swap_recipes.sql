alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe'));

create table if not exists public.swap_recipes (
  id uuid primary key default gen_random_uuid(),
  title_key text not null,
  title text not null,
  summary text not null,
  ingredients text[] not null,
  steps text[] not null,
  minutes integer,
  servings text,
  rule_tags text[] not null default '{}',
  source text not null check (source in ('ai', 'editorial')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (btrim(title) <> '' and char_length(title) <= 80),
  check (btrim(title_key) <> '' and char_length(title_key) <= 80),
  check (btrim(summary) <> '' and char_length(summary) <= 280),
  check (cardinality(ingredients) between 3 and 12),
  check (cardinality(steps) between 3 and 10),
  check (minutes is null or (minutes >= 1 and minutes <= 180)),
  check (servings is null or (btrim(servings) <> '' and char_length(servings) <= 40))
);

create unique index if not exists swap_recipes_title_key_idx
on public.swap_recipes (title_key);

alter table public.swap_recipes enable row level security;

drop policy if exists "Members read shared recipes"
on public.swap_recipes;
create policy "Members read shared recipes"
on public.swap_recipes for select to authenticated
using (true);

revoke all on table public.swap_recipes
from anon, public, authenticated;
grant select on table public.swap_recipes to authenticated;

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

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe') then
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
