drop policy if exists "Members update their planned event plans"
on public.planned_event_plans;
create policy "Members update their planned event plans"
on public.planned_event_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke delete on table public.planned_event_plans from authenticated;
grant update (suggestions, deleted, deleted_at)
on table public.planned_event_plans to authenticated;
