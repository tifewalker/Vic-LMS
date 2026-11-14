-- Announcements and learning materials, per programme (optionally tied to one class).
-- Same pattern as threads: enrolled students and tutors, plus admins, can read. Writes go through the API.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  class_id uuid references public.classes (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(body) between 1 and 10000),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index announcements_programme_idx on public.announcements (programme_id, pinned desc, created_at desc);

create type public.material_kind as enum ('file', 'link');

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '',
  kind public.material_kind not null,
  file_path text,
  url text,
  -- Shown to students ("PDF, 2.4 MB"); recorded from the upload.
  file_type text,
  file_size bigint,
  week integer check (week between 1 and 260),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'file' and file_path is not null) or (kind = 'link' and url is not null))
);
create index materials_programme_idx on public.materials (programme_id, week, created_at desc);

alter table public.announcements enable row level security;
alter table public.materials enable row level security;

create policy "Enrolled or admin" on public.announcements
  for select to authenticated using (public.can_read_programme(programme_id));

create policy "Enrolled or admin" on public.materials
  for select to authenticated using (public.can_read_programme(programme_id));

-- Materials also allow slides, spreadsheets and images. Assessment uploads stay PDF/Word only (checked by the API).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
]
where id = 'files';
