-- Live class screen: YouTube video IDs, the class live mode, pinned and reply-to messages in
-- live Q&A, and polls. All writes go through the API (service role); RLS covers reads only.

-- 1. Classes: the YouTube video ID is extracted from whatever link the admin pastes and stored
--    next to the link. live_mode says how students' pages refresh during the class:
--    realtime (Supabase Realtime) or light (a refresh every 25 seconds, for weak connections).
alter table public.classes
  add column youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  add column recording_id text check (recording_id ~ '^[A-Za-z0-9_-]{11}$'),
  add column live_mode text not null default 'realtime' check (live_mode in ('realtime', 'light'));

-- Fill the IDs for links saved before this migration (watch, youtu.be, /live/, /embed/, /shorts/).
update public.classes
set youtube_id = substring(youtube_url from '(?:[?&]v=|youtu\.be/|/live/|/embed/|/shorts/)([A-Za-z0-9_-]{11})')
where youtube_url is not null;
update public.classes
set recording_id = substring(recording_url from '(?:[?&]v=|youtu\.be/|/live/|/embed/|/shorts/)([A-Za-z0-9_-]{11})')
where recording_url is not null;

-- 2. Live Q&A: tutors pin questions to the top, and replies point at the message they answer.
alter table public.live_messages
  add column pinned boolean not null default false,
  add column pinned_at timestamptz,
  add column reply_to uuid references public.live_messages (id) on delete set null;

-- 3. Polls ------------------------------------------------------------------------------------
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  question text not null check (length(btrim(question)) between 1 and 300),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  show_results text not null default 'after_vote' check (show_results in ('after_vote', 'after_close')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz
);
create index polls_class_idx on public.polls (class_id, created_at);
-- At most one open poll per class: opening another closes the current one first.
create unique index polls_one_open_idx on public.polls (class_id) where status = 'open';

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 120),
  position smallint not null check (position between 0 and 4),
  unique (poll_id, position),
  -- Lets poll_votes check that the option belongs to the poll.
  unique (id, poll_id)
);

create table public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null,
  student_id uuid not null references public.students (profile_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, student_id),
  foreign key (option_id, poll_id) references public.poll_options (id, poll_id) on delete cascade
);
create index poll_votes_option_idx on public.poll_votes (option_id);

create function public.poll_programme(p_poll uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select c.programme_id from public.polls p join public.classes c on c.id = p.class_id where p.id = p_poll;
$$;
revoke execute on function public.poll_programme(uuid) from public, anon;
grant execute on function public.poll_programme(uuid) to authenticated;

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Enrolled users read polls and options; drafts only reach the programme's tutors and admins.
create policy "Enrolled (not drafts) or tutors and admin" on public.polls
  for select to authenticated
  using (
    (select public.is_admin())
    or public.is_programme_tutor(public.class_programme(class_id))
    or (status <> 'draft' and public.can_read_programme(public.class_programme(class_id)))
  );
create policy "Enrolled (not drafts) or tutors and admin" on public.poll_options
  for select to authenticated
  using (
    (select public.is_admin())
    or public.is_programme_tutor(public.poll_programme(poll_id))
    or (
      public.can_read_programme(public.poll_programme(poll_id))
      and exists (select 1 from public.polls p where p.id = poll_id and p.status <> 'draft')
    )
  );
-- A student reads only their own vote; tutors of the programme and admins read all.
create policy "Own vote, the programme's tutors, or admin" on public.poll_votes
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or public.is_programme_tutor(public.poll_programme(poll_id))
  );
