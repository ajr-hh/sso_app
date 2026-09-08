alter table public.coach_messages
add column if not exists show_message boolean not null default true;

create index if not exists coach_messages_visible_thread_idx
on public.coach_messages (user_id, coach_style, created_at, id)
where deleted = false and show_message = true;

drop policy if exists "Members hide their coach messages"
on public.coach_messages;
create policy "Members hide their coach messages"
on public.coach_messages for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant update (show_message) on table public.coach_messages to authenticated;
