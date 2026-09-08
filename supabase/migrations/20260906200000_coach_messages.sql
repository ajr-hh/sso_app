alter table public.profiles
add column if not exists coach_style_set boolean not null default false;

alter table public.profiles drop constraint if exists profiles_coach_style_check;
alter table public.profiles
add constraint profiles_coach_style_check
check (coach_style in ('marcus', 'elena', 'sam', 'jordan'));

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coach_style text not null check (coach_style in ('marcus', 'elena', 'sam', 'jordan')),
  role text not null check (role in ('member', 'coach')),
  body text not null check (
    btrim(body) <> ''
    and char_length(body) <= 400
  ),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists coach_messages_active_thread_idx
on public.coach_messages (user_id, coach_style, created_at, id)
where deleted = false;

alter table public.coach_messages enable row level security;

drop policy if exists "Members select their coach messages"
on public.coach_messages;
create policy "Members select their coach messages"
on public.coach_messages for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their coach messages"
on public.coach_messages;
create policy "Members insert their coach messages"
on public.coach_messages for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

revoke delete on table public.coach_messages from authenticated;
revoke all on table public.coach_messages
from anon, public, authenticated;
grant select on table public.coach_messages to authenticated;
grant insert (user_id, coach_style, role, body)
on table public.coach_messages to authenticated;

alter table public.generation_jobs
drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
add constraint generation_jobs_kind_check
check (kind in ('food_swaps', 'swap_recipe', 'coach_reply'));

revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  age,
  phone,
  why_matters,
  motivators,
  coach_style,
  coach_style_set,
  rail_order,
  food_rules_set,
  diet_flags,
  allergens
) on table public.profiles to authenticated;

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

  if job_kind is null or job_kind not in ('food_swaps', 'swap_recipe', 'coach_reply') then
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
