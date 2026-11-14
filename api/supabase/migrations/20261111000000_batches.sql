-- Programmes, training areas, batches and batch membership.
-- All writes go through the API with the service role. RLS only grants reads.

create type public.batch_status as enum ('planned', 'active', 'completed');

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  duration_weeks integer not null check (duration_weeks between 1 and 260),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.training_areas (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  position integer not null,
  unique (programme_id, position)
);

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  start_date date not null,
  end_date date not null,
  status public.batch_status not null default 'planned',
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (id, programme_id) -- target for the composite key on batch_students
);
create index batches_programme_status_idx on public.batches (programme_id, status);

-- programme_id is copied from the batch so a student can be in only one batch per programme.
create table public.batch_students (
  batch_id uuid not null,
  programme_id uuid not null,
  student_id uuid not null references public.students (profile_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (batch_id, student_id),
  unique (programme_id, student_id),
  foreign key (batch_id, programme_id) references public.batches (id, programme_id) on delete cascade on update cascade
);
create index batch_students_student_idx on public.batch_students (student_id);

create table public.batch_tutors (
  batch_id uuid not null references public.batches (id) on delete cascade,
  tutor_id uuid not null references public.tutors (profile_id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (batch_id, tutor_id)
);
create index batch_tutors_tutor_idx on public.batch_tutors (tutor_id);

-- RLS helpers. security definer so policies can check membership without recursing into RLS.
create function public.is_batch_tutor(p_batch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.batch_tutors where batch_id = p_batch and tutor_id = (select auth.uid()));
$$;

create function public.is_batch_student(p_batch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.batch_students where batch_id = p_batch and student_id = (select auth.uid()));
$$;

-- Programmes the current user belongs to through a batch (as tutor or student).
create function public.in_programme(p_programme uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batches b
    where b.programme_id = p_programme
      and (
        exists (select 1 from public.batch_tutors t where t.batch_id = b.id and t.tutor_id = (select auth.uid()))
        or exists (select 1 from public.batch_students s where s.batch_id = b.id and s.student_id = (select auth.uid()))
      )
  );
$$;

-- The current user is a tutor of a batch this student is in.
create function public.teaches_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batch_students s
    join public.batch_tutors t on t.batch_id = s.batch_id
    where s.student_id = p_student and t.tutor_id = (select auth.uid())
  );
$$;

-- The current user is a student in a batch this tutor teaches.
create function public.has_tutor(p_tutor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batch_tutors t
    join public.batch_students s on s.batch_id = t.batch_id
    where t.tutor_id = p_tutor and s.student_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_batch_tutor(uuid), public.is_batch_student(uuid), public.in_programme(uuid),
  public.teaches_student(uuid), public.has_tutor(uuid) from public, anon;
grant execute on function public.is_batch_tutor(uuid), public.is_batch_student(uuid), public.in_programme(uuid),
  public.teaches_student(uuid), public.has_tutor(uuid) to authenticated;

alter table public.programmes enable row level security;
alter table public.training_areas enable row level security;
alter table public.batches enable row level security;
alter table public.batch_students enable row level security;
alter table public.batch_tutors enable row level security;

create policy "Admins, or members of the programme" on public.programmes
  for select to authenticated using ((select public.is_admin()) or public.in_programme(id));

create policy "Admins, or members of the programme" on public.training_areas
  for select to authenticated using ((select public.is_admin()) or public.in_programme(programme_id));

create policy "Admins, or the batch's tutors and students" on public.batches
  for select to authenticated using ((select public.is_admin()) or public.is_batch_tutor(id) or public.is_batch_student(id));

create policy "Admins, the batch's tutors, or the student" on public.batch_students
  for select to authenticated using ((select public.is_admin()) or student_id = (select auth.uid()) or public.is_batch_tutor(batch_id));

create policy "Admins, the tutor, or the batch's students" on public.batch_tutors
  for select to authenticated using ((select public.is_admin()) or tutor_id = (select auth.uid()) or public.is_batch_student(batch_id));

-- People: tutors read the students in their batches; students read their tutors.
create policy "Tutors read their students" on public.profiles
  for select to authenticated using (public.teaches_student(id));
create policy "Students read their tutors" on public.profiles
  for select to authenticated using (public.has_tutor(id));
create policy "Tutors read their students' records" on public.students
  for select to authenticated using (public.teaches_student(profile_id));
create policy "Students read their tutors' records" on public.tutors
  for select to authenticated using (public.has_tutor(profile_id));

-- Service-role helpers for the admin screens (not callable from browsers).
create function public.available_students(p_programme uuid, p_q text default '', p_limit integer default 50)
returns table (id uuid, full_name text, email text, status public.profile_status, matric_no text)
language sql stable set search_path = '' as $$
  select p.id, p.full_name, p.email, p.status, s.matric_no
  from public.profiles p
  join public.students s on s.profile_id = p.id
  where p.status <> 'suspended'
    and not exists (select 1 from public.batch_students bs where bs.student_id = p.id and bs.programme_id = p_programme)
    and (coalesce(p_q, '') = '' or p.full_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%' or s.matric_no ilike '%' || p_q || '%')
  order by p.full_name
  limit least(greatest(p_limit, 1), 200);
$$;

create function public.count_students_without_batch() returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where p.status <> 'suspended'
    and not exists (select 1 from public.batch_students bs where bs.student_id = s.profile_id);
$$;

revoke execute on function public.available_students(uuid, text, integer), public.count_students_without_batch()
  from public, anon, authenticated;

-- Seed: the OAUSTECH programme and its eight training areas (from web/src/content/landing.ts).
with p as (
  insert into public.programmes (name, slug, description, duration_weeks)
  values (
    'OAUSTECH Entrepreneurship, ICT, Digital Skills & Emerging Technologies Training Programme',
    'oaustech-entrepreneurship-ict-digital-skills',
    '26 weeks of learning, practical training, creativity and innovation.',
    26
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.training_areas (programme_id, title, position)
select p.id, a.title, a.position
from p
cross join (values
  (1, 'Entrepreneurship and Business Development'),
  (2, 'Information Technology and Digital Productivity'),
  (3, 'Digital Marketing and Business Analytics'),
  (4, 'Artificial Intelligence and Machine Learning'),
  (5, 'Cybersecurity and Data Protection'),
  (6, 'Drone Technology and Aerial Data Applications'),
  (7, 'Data Processing, Analysis and Visualisation'),
  (8, 'Emerging Technologies: Internet of Things and Blockchain')
) as a (position, title);
