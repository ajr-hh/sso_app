-- Idempotent: safe to re-run. A failed run leaves nothing behind, so re-running
-- the whole file is the supported way to repair a partially applied schema.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age integer,
  phone text,
  why_matters text,
  motivators text not null default 'Remember why',
  coach_style text not null default 'marcus',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles
add column if not exists deleted boolean not null default false;

-- Ordinary app deletes set deleted = true plus deleted_at; rows are never
-- removed. Deleting the Auth account is still permanent erasure.
update public.profiles
set deleted = true
where deleted_at is not null and deleted = false;

-- Preserve phone values entered through the earlier combined contact field.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'contact_info'
  ) then
    execute '
      update public.profiles
      set phone = nullif(trim(contact_info), '''')
      where phone is null and nullif(trim(contact_info), '''') is not null
    ';
  end if;
end;
$$;

create or replace view public.community_profiles
with (security_barrier = true)
as
select id, display_name
from public.profiles
where deleted = false;

revoke all on public.community_profiles from public, anon;
grant select on public.community_profiles to authenticated;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  day date not null default current_date
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null check (path in ('off_the_rails', 'planned_event')),
  reinforcement text,
  created_at timestamptz not null default now()
);

create table if not exists public.reinforcement_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_key text not null,
  caption text,
  tag text,
  mode text not null check (mode in ('remember_why', 'hard_truths')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.goals
add column if not exists deleted_at timestamptz;
alter table public.goals
add column if not exists deleted boolean not null default false;
alter table public.daily_tasks
add column if not exists deleted_at timestamptz;
alter table public.daily_tasks
add column if not exists deleted boolean not null default false;
alter table public.journal_entries
add column if not exists deleted_at timestamptz;
alter table public.journal_entries
add column if not exists deleted boolean not null default false;
alter table public.sos_events
add column if not exists deleted_at timestamptz;
alter table public.sos_events
add column if not exists deleted boolean not null default false;
alter table public.reinforcement_photos
add column if not exists deleted_at timestamptz;
alter table public.reinforcement_photos
add column if not exists deleted boolean not null default false;
alter table public.community_posts
add column if not exists deleted_at timestamptz;
alter table public.community_posts
add column if not exists deleted boolean not null default false;

update public.goals
set deleted = true
where deleted_at is not null and deleted = false;
update public.daily_tasks
set deleted = true
where deleted_at is not null and deleted = false;
update public.journal_entries
set deleted = true
where deleted_at is not null and deleted = false;
update public.sos_events
set deleted = true
where deleted_at is not null and deleted = false;
update public.reinforcement_photos
set deleted = true
where deleted_at is not null and deleted = false;
update public.community_posts
set deleted = true
where deleted_at is not null and deleted = false;

-- Superseded: the profiles primary key already serves single-row lookups.
drop index if exists public.profiles_active_id_idx;

drop index if exists public.goals_active_user_sort_idx;
drop index if exists public.daily_tasks_active_user_day_idx;
drop index if exists public.journal_entries_active_user_created_idx;
drop index if exists public.sos_events_active_user_created_idx;
drop index if exists public.reinforcement_photos_active_user_mode_created_idx;
drop index if exists public.community_posts_active_created_idx;

create index goals_active_user_sort_idx
on public.goals (user_id, sort_order)
where deleted = false;
create index daily_tasks_active_user_day_idx
on public.daily_tasks (user_id, day, id)
where deleted = false;
create index journal_entries_active_user_created_idx
on public.journal_entries (user_id, created_at desc)
where deleted = false;
create index sos_events_active_user_created_idx
on public.sos_events (user_id, created_at desc)
where deleted = false;
create index reinforcement_photos_active_user_mode_created_idx
on public.reinforcement_photos (user_id, mode, created_at desc)
where deleted = false;
create index community_posts_active_created_idx
on public.community_posts (created_at desc)
where deleted = false;

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.sos_events enable row level security;
alter table public.reinforcement_photos enable row level security;
alter table public.community_posts enable row level security;

drop policy if exists "Members manage their own profile" on public.profiles;
drop policy if exists "Members select their active profile" on public.profiles;
drop policy if exists "Members insert their active profile" on public.profiles;
drop policy if exists "Members update their active profile" on public.profiles;
create policy "Members select their active profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "Members insert their active profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
-- Profiles have no app delete path. Column grants below prevent tombstoning.
create policy "Members update their active profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Members manage their own goals" on public.goals;
drop policy if exists "Members select their active goals" on public.goals;
drop policy if exists "Members insert their active goals" on public.goals;
drop policy if exists "Members update their active goals" on public.goals;
create policy "Members select their active goals"
on public.goals for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Members insert their active goals"
on public.goals for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active goals"
on public.goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members manage their own daily tasks" on public.daily_tasks;
drop policy if exists "Members select their active daily tasks" on public.daily_tasks;
drop policy if exists "Members insert their active daily tasks" on public.daily_tasks;
drop policy if exists "Members update their active daily tasks" on public.daily_tasks;
create policy "Members select their active daily tasks"
on public.daily_tasks for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Members insert their active daily tasks"
on public.daily_tasks for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active daily tasks"
on public.daily_tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members manage their own journal entries" on public.journal_entries;
drop policy if exists "Members select their active journal entries" on public.journal_entries;
drop policy if exists "Members insert their active journal entries" on public.journal_entries;
drop policy if exists "Members update their active journal entries" on public.journal_entries;
create policy "Members select their active journal entries"
on public.journal_entries for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Members insert their active journal entries"
on public.journal_entries for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active journal entries"
on public.journal_entries for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members manage their own SOS events" on public.sos_events;
drop policy if exists "Members select their active SOS events" on public.sos_events;
drop policy if exists "Members insert their active SOS events" on public.sos_events;
drop policy if exists "Members update their active SOS events" on public.sos_events;
create policy "Members select their active SOS events"
on public.sos_events for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Members insert their active SOS events"
on public.sos_events for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active SOS events"
on public.sos_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members manage their own reinforcement photos" on public.reinforcement_photos;
drop policy if exists "Members select their active reinforcement photos" on public.reinforcement_photos;
drop policy if exists "Members insert their active reinforcement photos" on public.reinforcement_photos;
drop policy if exists "Members update their active reinforcement photos" on public.reinforcement_photos;
create policy "Members select their active reinforcement photos"
on public.reinforcement_photos for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Members insert their active reinforcement photos"
on public.reinforcement_photos for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active reinforcement photos"
on public.reinforcement_photos for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated members read community posts" on public.community_posts;
drop policy if exists "Members create their own community posts" on public.community_posts;
drop policy if exists "Members delete their own community posts" on public.community_posts;
drop policy if exists "Authenticated members select active community posts" on public.community_posts;
drop policy if exists "Members insert their active community posts" on public.community_posts;
drop policy if exists "Members update their active community posts" on public.community_posts;
-- The community feed is shared: every authenticated member may read every
-- active post.
create policy "Authenticated members select active community posts"
on public.community_posts for select to authenticated
using (deleted = false);
create policy "Members insert their active community posts"
on public.community_posts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Members update their active community posts"
on public.community_posts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke delete on table
  public.profiles,
  public.goals,
  public.daily_tasks,
  public.journal_entries,
  public.sos_events,
  public.reinforcement_photos,
  public.community_posts
from authenticated;

-- The community update policy exists only to soft-delete. Column-level grants
-- stop an owner from rewriting the body of a post others have already read.
revoke update on table public.community_posts from authenticated;
grant update (deleted, deleted_at) on table public.community_posts to authenticated;

-- Profiles cannot be app-deleted. Grant only the fields saveProfile writes.
revoke update on table public.profiles from authenticated;
grant update (
  display_name,
  age,
  phone,
  why_matters,
  motivators,
  coach_style
) on table public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists handle_new_user on auth.users;
create trigger handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

-- The trigger only fires for new sign-ups, so give any account that already
-- exists (including ones created before this migration) a profile row.
insert into public.profiles (id)
select users.id
from auth.users as users
where not exists (
  select 1 from public.profiles as existing where existing.id = users.id
);

insert into storage.buckets (id, name, public)
values ('sos-photos', 'sos-photos', false)
on conflict (id) do nothing;

drop policy if exists "Members read their own SOS photos" on storage.objects;
create policy "Members read their own SOS photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members upload their own SOS photos" on storage.objects;
create policy "Members upload their own SOS photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Members delete their own SOS photos" on storage.objects;
create policy "Members delete their own SOS photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
