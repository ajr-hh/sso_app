create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  age integer,
  contact_info text,
  why_matters text,
  motivators text not null default 'Remember why',
  coach_style text not null default 'marcus',
  created_at timestamptz not null default now()
);

create view public.community_profiles
with (security_barrier = true)
as
select id, display_name
from public.profiles;

revoke all on public.community_profiles from public, anon;
grant select on public.community_profiles to authenticated;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  day date not null default current_date
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null check (path in ('off_the_rails', 'planned_event')),
  reinforcement text,
  created_at timestamptz not null default now()
);

create table public.reinforcement_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_key text not null,
  caption text,
  tag text,
  mode text not null check (mode in ('remember_why', 'hard_truths')),
  created_at timestamptz not null default now()
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.sos_events enable row level security;
alter table public.reinforcement_photos enable row level security;
alter table public.community_posts enable row level security;

create policy "Members manage their own profile"
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Members manage their own goals"
on public.goals
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members manage their own daily tasks"
on public.daily_tasks
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members manage their own journal entries"
on public.journal_entries
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members manage their own SOS events"
on public.sos_events
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members manage their own reinforcement photos"
on public.reinforcement_photos
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Authenticated members read community posts"
on public.community_posts
for select
to authenticated
using (true);

create policy "Members create their own community posts"
on public.community_posts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members delete their own community posts"
on public.community_posts
for delete
to authenticated
using ((select auth.uid()) = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('sos-photos', 'sos-photos', false);

create policy "Members read their own SOS photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Members upload their own SOS photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Members delete their own SOS photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'sos-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
