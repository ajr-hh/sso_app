create table if not exists public.planned_event_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_kind text not null check (
    event_kind in ('holiday_meal', 'celebration', 'travel', 'other')
  ),
  custom_label text,
  suggestions jsonb not null,
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null)),
  check (
    (
      event_kind <> 'other'
      and custom_label is null
    )
    or (
      event_kind = 'other'
      and custom_label is not null
      and btrim(custom_label) <> ''
      and char_length(custom_label) <= 80
    )
  ),
  check (
    jsonb_typeof(suggestions) = 'array'
    and jsonb_array_length(suggestions) = 3
  )
);

create index if not exists planned_event_plans_user_id_idx
on public.planned_event_plans (user_id);

create index if not exists planned_event_plans_active_user_created_idx
on public.planned_event_plans (user_id, created_at, id)
where deleted = false;

alter table public.planned_event_plans enable row level security;

drop policy if exists "Members select their planned event plans"
on public.planned_event_plans;
create policy "Members select their planned event plans"
on public.planned_event_plans for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their planned event plans"
on public.planned_event_plans;
create policy "Members insert their planned event plans"
on public.planned_event_plans for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.planned_event_plans from authenticated;
revoke all on table public.planned_event_plans
from anon, public, authenticated;
grant select on table public.planned_event_plans to authenticated;
grant insert (user_id, event_kind, custom_label, suggestions)
on table public.planned_event_plans to authenticated;

alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions'));

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

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach', 'planned_suggestions') then
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
