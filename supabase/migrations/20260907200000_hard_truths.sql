alter table public.reinforcement_photos
add column if not exists favorited boolean not null default false;

revoke update on table public.reinforcement_photos from authenticated;
grant update (caption, favorited, deleted, deleted_at)
on table public.reinforcement_photos to authenticated;

create table if not exists public.hard_truths_coach_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coach_style text not null check (coach_style in ('marcus', 'elena', 'sam', 'jordan')),
  body text not null check (
    btrim(body) <> ''
    and char_length(body) <= 400
  ),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create unique index if not exists hard_truths_coach_lines_active_user_coach_idx
on public.hard_truths_coach_lines (user_id, coach_style)
where deleted = false;

create index if not exists hard_truths_coach_lines_user_id_idx
on public.hard_truths_coach_lines (user_id);

alter table public.hard_truths_coach_lines enable row level security;

drop policy if exists "Members select their hard truths coach lines"
on public.hard_truths_coach_lines;
create policy "Members select their hard truths coach lines"
on public.hard_truths_coach_lines for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their hard truths coach lines"
on public.hard_truths_coach_lines;
create policy "Members insert their hard truths coach lines"
on public.hard_truths_coach_lines for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.hard_truths_coach_lines from authenticated;
revoke all on table public.hard_truths_coach_lines
from anon, public, authenticated;
grant select on table public.hard_truths_coach_lines to authenticated;
grant insert (user_id, coach_style, body)
on table public.hard_truths_coach_lines to authenticated;

alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach'));

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

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply', 'research_fact', 'hard_truths_coach') then
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
