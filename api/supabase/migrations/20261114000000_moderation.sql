-- Moderation: admins can hide live messages, threads and replies, and mute users in chat.
-- Hidden rows disappear for students and tutors (RLS and the API both filter them);
-- admins still see them. Every moderation action is written to moderation_log.

-- 1. Hidden flags ------------------------------------------------------------------------
alter table public.live_messages
  add column hidden boolean not null default false,
  add column hidden_by uuid references public.profiles (id) on delete set null,
  add column hidden_at timestamptz;
alter table public.threads
  add column hidden boolean not null default false,
  add column hidden_by uuid references public.profiles (id) on delete set null,
  add column hidden_at timestamptz;
alter table public.replies
  add column hidden boolean not null default false,
  add column hidden_by uuid references public.profiles (id) on delete set null,
  add column hidden_at timestamptz;

-- 2. Muted users can read but not post -------------------------------------------------------
alter table public.profiles add column chat_muted boolean not null default false;

-- 3. Logs ------------------------------------------------------------------------------------
create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in (
    'hide', 'unhide', 'mark_answered', 'mark_unanswered', 'pin', 'unpin', 'reply', 'mute', 'unmute'
  )),
  target_type text not null check (target_type in ('live_message', 'thread', 'reply', 'user')),
  target_id uuid not null,
  reason text check (reason is null or length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index moderation_log_created_idx on public.moderation_log (created_at desc);

-- Student imports, for the admin activity feed.
create table public.import_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  created_count integer not null check (created_count >= 0),
  created_at timestamptz not null default now()
);
create index import_log_created_idx on public.import_log (created_at desc);

alter table public.moderation_log enable row level security;
alter table public.import_log enable row level security;
create policy "Admins" on public.moderation_log for select to authenticated using ((select public.is_admin()));
create policy "Admins" on public.import_log for select to authenticated using ((select public.is_admin()));

-- 4. Read policies: hidden rows only for admins ----------------------------------------------
drop policy "Enrolled or admin" on public.threads;
drop policy "Enrolled or admin" on public.replies;
drop policy "Enrolled or admin" on public.live_messages;

create policy "Enrolled (not hidden) or admin" on public.threads
  for select to authenticated
  using ((select public.is_admin()) or (not hidden and public.can_read_programme(programme_id)));
create policy "Enrolled (not hidden) or admin" on public.replies
  for select to authenticated
  using ((select public.is_admin()) or (not hidden and public.can_read_programme(public.thread_programme(thread_id))));
create policy "Enrolled (not hidden) or admin" on public.live_messages
  for select to authenticated
  using ((select public.is_admin()) or (not hidden and public.can_read_programme(public.class_programme(class_id))));

-- Indexes for the admin queues (unanswered questions, ungraded work).
create index live_messages_open_questions_idx on public.live_messages (created_at desc) where is_question and not answered and not hidden;
create index threads_open_questions_idx on public.threads (created_at desc) where kind = 'question' and not answered and not hidden;
