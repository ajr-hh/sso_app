create table if not exists public.research_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  num text check (num is null or (btrim(num) <> '' and char_length(num) <= 12)),
  title text not null check (
    btrim(title) <> ''
    and char_length(title) <= 80
  ),
  body text not null check (
    btrim(body) <> ''
    and char_length(body) <= 280
  ),
  source text not null check (source in ('ai', 'member')),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists research_facts_active_user_created_idx
on public.research_facts (user_id, created_at, id)
where deleted = false;

alter table public.research_facts enable row level security;

drop policy if exists "Members select their research facts"
on public.research_facts;
create policy "Members select their research facts"
on public.research_facts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their research facts"
on public.research_facts;
create policy "Members insert their research facts"
on public.research_facts for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.research_facts from authenticated;
revoke all on table public.research_facts
from anon, public, authenticated;
grant select on table public.research_facts to authenticated;
grant insert (user_id, num, title, body, source)
on table public.research_facts to authenticated;

alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact'));

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

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact') then
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
