-- Rework: programmes are courses that students and tutors enrol in; classes are sessions inside them.
-- Replaces the batch model from 20261111000000_batches.sql.
-- All writes go through the API with the service role. RLS only grants reads.

-- 1. Remove the batch model ---------------------------------------------------------------
drop table if exists public.batch_students, public.batch_tutors, public.batches, public.training_areas, public.programmes cascade;
drop function if exists public.is_batch_tutor(uuid), public.is_batch_student(uuid), public.in_programme(uuid),
  public.available_students(uuid, text, integer), public.count_students_without_batch();
drop type if exists public.batch_status;

-- 2. Types -------------------------------------------------------------------------------
create type public.class_status as enum ('scheduled', 'live', 'ended');
create type public.thread_kind as enum ('question', 'discussion');
create type public.assessment_mode as enum ('digital', 'paper');
create type public.submission_status as enum ('submitted', 'late', 'received_paper', 'graded');

-- 3. Tables ------------------------------------------------------------------------------
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  cover_note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.programme_students (
  programme_id uuid not null references public.programmes (id) on delete cascade,
  student_id uuid not null references public.students (profile_id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (programme_id, student_id)
);
create index programme_students_student_idx on public.programme_students (student_id);

create table public.programme_tutors (
  programme_id uuid not null references public.programmes (id) on delete cascade,
  tutor_id uuid not null references public.tutors (profile_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (programme_id, tutor_id)
);
create index programme_tutors_tutor_idx on public.programme_tutors (tutor_id);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  youtube_url text,
  recording_url text,
  status public.class_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index classes_programme_starts_idx on public.classes (programme_id, starts_at);

-- Kept apart from classes so students can never read it.
create table public.class_tutor_links (
  class_id uuid primary key references public.classes (id) on delete cascade,
  zoom_url text,
  zoom_passcode text
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade, -- null: programme-wide
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.thread_kind not null default 'discussion',
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(body) between 1 and 10000),
  pinned boolean not null default false,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);
create index threads_programme_idx on public.threads (programme_id, class_id, created_at desc);

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 10000),
  is_answer boolean not null default false,
  created_at timestamptz not null default now()
);
create index replies_thread_idx on public.replies (thread_id, created_at);

create table public.live_messages (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  is_question boolean not null default false,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);
create index live_messages_class_idx on public.live_messages (class_id, created_at);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  instructions text not null default '',
  attachment_path text,
  due_at timestamptz,
  max_score numeric(6, 2) not null default 100 check (max_score > 0),
  mode public.assessment_mode not null default 'digital',
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index assessments_programme_idx on public.assessments (programme_id, due_at);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  student_id uuid not null references public.students (profile_id) on delete cascade,
  text text,
  file_path text,
  link text,
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table public.grades (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  score numeric(6, 2) not null check (score >= 0),
  feedback text not null default '',
  graded_by uuid references public.profiles (id) on delete set null,
  graded_at timestamptz not null default now(),
  released boolean not null default false
);

-- 4. Access helpers (security definer so policies do not recurse into RLS) -------------
create function public.is_programme_student(p_programme uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programme_students where programme_id = p_programme and student_id = (select auth.uid()));
$$;

create function public.is_programme_tutor(p_programme uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.programme_tutors where programme_id = p_programme and tutor_id = (select auth.uid()));
$$;

create function public.can_read_programme(p_programme uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.is_programme_student(p_programme) or public.is_programme_tutor(p_programme);
$$;

create function public.class_programme(p_class uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select programme_id from public.classes where id = p_class;
$$;

create function public.thread_programme(p_thread uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select programme_id from public.threads where id = p_thread;
$$;

create function public.assessment_programme(p_assessment uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select programme_id from public.assessments where id = p_assessment;
$$;

create function public.submission_owner(p_submission uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select student_id from public.submissions where id = p_submission;
$$;

create function public.submission_programme(p_submission uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.programme_id from public.submissions s join public.assessments a on a.id = s.assessment_id where s.id = p_submission;
$$;

-- People: a tutor reads the students in their programmes; a student reads their tutors.
-- Same names as before, so the existing policies on profiles, students and tutors keep working.
create or replace function public.teaches_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.programme_students s
    join public.programme_tutors t on t.programme_id = s.programme_id
    where s.student_id = p_student and t.tutor_id = (select auth.uid())
  );
$$;

create or replace function public.has_tutor(p_tutor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.programme_tutors t
    join public.programme_students s on s.programme_id = t.programme_id
    where t.tutor_id = p_tutor and s.student_id = (select auth.uid())
  );
$$;

revoke execute on function
  public.is_programme_student(uuid), public.is_programme_tutor(uuid), public.can_read_programme(uuid),
  public.class_programme(uuid), public.thread_programme(uuid), public.assessment_programme(uuid),
  public.submission_owner(uuid), public.submission_programme(uuid)
  from public, anon;
grant execute on function
  public.is_programme_student(uuid), public.is_programme_tutor(uuid), public.can_read_programme(uuid),
  public.class_programme(uuid), public.thread_programme(uuid), public.assessment_programme(uuid),
  public.submission_owner(uuid), public.submission_programme(uuid)
  to authenticated;

-- 5. Row level security: reads only -----------------------------------------------------
alter table public.programmes enable row level security;
alter table public.programme_students enable row level security;
alter table public.programme_tutors enable row level security;
alter table public.classes enable row level security;
alter table public.class_tutor_links enable row level security;
alter table public.threads enable row level security;
alter table public.replies enable row level security;
alter table public.live_messages enable row level security;
alter table public.assessments enable row level security;
alter table public.submissions enable row level security;
alter table public.grades enable row level security;

create policy "Enrolled or admin" on public.programmes
  for select to authenticated using (public.can_read_programme(id));

create policy "Own enrolment, the programme's tutors, or admin" on public.programme_students
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_programme_tutor(programme_id) or (select public.is_admin()));

create policy "Enrolled or admin" on public.programme_tutors
  for select to authenticated using (public.can_read_programme(programme_id));

create policy "Enrolled or admin" on public.classes
  for select to authenticated using (public.can_read_programme(programme_id));

create policy "The programme's tutors or admin" on public.class_tutor_links
  for select to authenticated
  using ((select public.is_admin()) or public.is_programme_tutor(public.class_programme(class_id)));

create policy "Enrolled or admin" on public.threads
  for select to authenticated using (public.can_read_programme(programme_id));

create policy "Enrolled or admin" on public.replies
  for select to authenticated using (public.can_read_programme(public.thread_programme(thread_id)));

create policy "Enrolled or admin" on public.live_messages
  for select to authenticated using (public.can_read_programme(public.class_programme(class_id)));

create policy "Published to students; all to tutors and admins" on public.assessments
  for select to authenticated
  using (
    (select public.is_admin()) or public.is_programme_tutor(programme_id)
    or (published and public.is_programme_student(programme_id))
  );

create policy "Own submission, the programme's tutors, or admin" on public.submissions
  for select to authenticated
  using (
    student_id = (select auth.uid()) or (select public.is_admin())
    or public.is_programme_tutor(public.assessment_programme(assessment_id))
  );

create policy "Released own grade, the programme's tutors, or admin" on public.grades
  for select to authenticated
  using (
    (select public.is_admin()) or public.is_programme_tutor(public.submission_programme(submission_id))
    or (released and public.submission_owner(submission_id) = (select auth.uid()))
  );

-- 6. Service-role helpers for the admin screens ------------------------------------------
create function public.count_students_not_enrolled() returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where p.status <> 'suspended'
    and not exists (select 1 from public.programme_students ps where ps.student_id = s.profile_id);
$$;
revoke execute on function public.count_students_not_enrolled() from public, anon, authenticated;

-- 7. Realtime: the web app subscribes directly; RLS still applies to each subscriber -----
alter publication supabase_realtime add table public.live_messages, public.threads, public.replies;

-- 8. Storage: private bucket for assessment attachments and submissions -------------------
-- No storage policies: browsers only ever use signed URLs issued by the API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'files', 'files', false, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 9. Seed: one programme per training area (web/src/content/landing.ts) -------------------
insert into public.programmes (title, slug, description, cover_note) values
  ('Entrepreneurship and Business Development', 'entrepreneurship-and-business-development',
   'Turn ideas into opportunities.',
   'A better understanding of how to identify opportunities, develop business ideas and take the first steps towards building a business.'),
  ('Information Technology and Digital Productivity', 'information-technology-and-digital-productivity',
   'Understand the technology behind today''s digital world.',
   'Practical digital knowledge and the confidence to work with common technology tools and systems.'),
  ('Digital Marketing and Business Analytics', 'digital-marketing-and-business-analytics',
   'Learn how businesses attract customers and make better decisions using digital platforms and data.',
   'The ability to understand digital marketing channels, promote products and services online, and use data to evaluate performance.'),
  ('Artificial Intelligence and Machine Learning', 'artificial-intelligence-and-machine-learning',
   'Explore how intelligent systems are changing the world.',
   'An understanding of modern AI tools and how they can be used to improve productivity, solve problems and develop new opportunities.'),
  ('Cybersecurity and Data Protection', 'cybersecurity-and-data-protection',
   'Learn how to protect information, devices and digital systems.',
   'Practical awareness of digital risks and the knowledge to adopt safer technology practices.'),
  ('Drone Technology and Aerial Data Applications', 'drone-technology-and-aerial-data-applications',
   'Take technology beyond the computer screen.',
   'An understanding of drone technology, its practical uses and how aerial data can support business, research and industry.'),
  ('Data Processing, Analysis and Visualisation', 'data-processing-analysis-and-visualisation',
   'Learn how to turn raw information into useful insights.',
   'The ability to work with data, organise information, identify patterns and communicate findings.'),
  ('Emerging Technologies: Internet of Things and Blockchain', 'emerging-technologies-internet-of-things-and-blockchain',
   'Explore technologies shaping the next generation of digital products and services.',
   'A foundational understanding of emerging technologies and the opportunities they may create across different industries.')
on conflict (slug) do nothing;
