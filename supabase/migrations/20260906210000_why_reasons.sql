create table if not exists public.why_reasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (
    btrim(label) <> ''
    and char_length(label) <= 80
  ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null))
);

create unique index if not exists why_reasons_active_user_label_idx
on public.why_reasons (user_id, lower(label))
where deleted = false;

create index if not exists why_reasons_active_user_sort_idx
on public.why_reasons (user_id, sort_order, id)
where deleted = false;

alter table public.why_reasons enable row level security;

drop policy if exists "Members select their why reasons"
on public.why_reasons;
create policy "Members select their why reasons"
on public.why_reasons for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their why reasons"
on public.why_reasons;
create policy "Members insert their why reasons"
on public.why_reasons for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

drop policy if exists "Members update their why reasons"
on public.why_reasons;
create policy "Members update their why reasons"
on public.why_reasons for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

revoke delete on table public.why_reasons from authenticated;
revoke all on table public.why_reasons
from anon, public, authenticated;
grant select on table public.why_reasons to authenticated;
grant insert (user_id, label, sort_order)
on table public.why_reasons to authenticated;
grant update (label, sort_order, deleted, deleted_at)
on table public.why_reasons to authenticated;

revoke update on table public.reinforcement_photos from authenticated;
grant update (caption, deleted, deleted_at)
on table public.reinforcement_photos to authenticated;
