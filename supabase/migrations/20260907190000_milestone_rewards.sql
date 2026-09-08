create table if not exists public.milestone_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone text not null check (
    btrim(milestone) <> ''
    and char_length(milestone) <= 80
  ),
  reward text not null check (
    btrim(reward) <> ''
    and char_length(reward) <= 120
  ),
  progress_note text check (
    progress_note is null
    or (
      btrim(progress_note) <> ''
      and char_length(progress_note) <= 40
    )
  ),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted boolean not null default false,
  deleted_at timestamptz,
  check (deleted = (deleted_at is not null)),
  check (completed = (completed_at is not null))
);

create index if not exists milestone_rewards_user_id_idx
on public.milestone_rewards (user_id);

create index if not exists milestone_rewards_active_user_created_idx
on public.milestone_rewards (user_id, created_at, id)
where deleted = false;

alter table public.milestone_rewards enable row level security;

drop policy if exists "Members select their milestone rewards"
on public.milestone_rewards;
create policy "Members select their milestone rewards"
on public.milestone_rewards for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members insert their milestone rewards"
on public.milestone_rewards;
create policy "Members insert their milestone rewards"
on public.milestone_rewards for insert to authenticated
with check ((select auth.uid()) = user_id and deleted = false);

drop policy if exists "Members update their milestone rewards"
on public.milestone_rewards;
create policy "Members update their milestone rewards"
on public.milestone_rewards for update to authenticated
using ((select auth.uid()) = user_id and deleted = false)
with check ((select auth.uid()) = user_id);

revoke delete on table public.milestone_rewards from authenticated;
revoke all on table public.milestone_rewards
from anon, public, authenticated;
grant select on table public.milestone_rewards to authenticated;
grant insert (user_id, milestone, reward, progress_note, completed, completed_at)
on table public.milestone_rewards to authenticated;
grant update (milestone, reward, progress_note, completed, completed_at, deleted, deleted_at)
on table public.milestone_rewards to authenticated;
