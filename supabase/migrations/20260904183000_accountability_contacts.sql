create table if not exists public.accountability_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (
    btrim(name) <> '' and char_length(name) <= 120
  ),
  phone text not null check (
    btrim(phone) <> ''
    and char_length(phone) <= 40
    and length(regexp_replace(phone, '\D', '', 'g')) >= 7
  ),
  email text not null check (
    btrim(email) <> ''
    and char_length(email) <= 320
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  relationship text not null check (
    relationship in (
      'spouse',
      'father',
      'mother',
      'daughter',
      'son',
      'friend',
      'colleague',
      'other'
    )
  ),
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create index if not exists accountability_contacts_active_user_created_idx
on public.accountability_contacts (user_id, created_at, id)
where deleted = false;

alter table public.accountability_contacts enable row level security;

drop policy if exists "Members select their active accountability contacts"
on public.accountability_contacts;
drop policy if exists "Members select their accountability contacts"
on public.accountability_contacts;
-- Owners must see soft-deleted rows so removal can return the updated id.
create policy "Members select their accountability contacts"
on public.accountability_contacts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their active accountability contacts"
on public.accountability_contacts;
create policy "Members insert their active accountability contacts"
on public.accountability_contacts for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

drop policy if exists "Members soft-delete their accountability contacts"
on public.accountability_contacts;
create policy "Members soft-delete their accountability contacts"
on public.accountability_contacts for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

revoke all on table public.accountability_contacts
from anon, public, authenticated;
grant select on table public.accountability_contacts to authenticated;
grant insert (user_id, name, phone, email, relationship)
on table public.accountability_contacts to authenticated;
grant update (deleted, deleted_at)
on table public.accountability_contacts to authenticated;

alter table public.profiles
alter column motivators set default 'Remember Your Why';
