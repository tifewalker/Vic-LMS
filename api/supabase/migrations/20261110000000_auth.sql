-- Auth and user management: profiles, students, tutors, invitations, email log.
-- All writes go through the API with the service role. RLS only grants reads.

create type public.user_role as enum ('student', 'tutor', 'admin', 'super_admin');
create type public.profile_status as enum ('invited', 'active', 'suspended');
create type public.invitation_status as enum ('pending', 'sent', 'activated', 'expired');

-- Profiles: one per auth user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  email text not null unique check (email = lower(btrim(email))),
  status public.profile_status not null default 'invited',
  created_at timestamptz not null default now()
);
create index profiles_role_status_idx on public.profiles (role, status);

-- Students: matric numbers are stored trimmed and uppercase.
create table public.students (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  matric_no text not null unique check (matric_no <> '' and matric_no = upper(btrim(matric_no)))
);

-- Tutors: tutor_id generated as VEC-TUT-0001, VEC-TUT-0002, ...
create sequence public.tutor_id_seq;
create table public.tutors (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  tutor_id text not null unique default ('VEC-TUT-' || lpad(nextval('public.tutor_id_seq')::text, 4, '0'))
);

-- Invitations: one per invited account. Only the SHA-256 hash of the token is stored.
-- A resend writes a new hash, which cancels the previous link.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  token_hash text unique,
  expires_at timestamptz,
  used_at timestamptz,
  status public.invitation_status not null default 'pending',
  attempts integer not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_pending_idx on public.invitations (created_at) where status = 'pending';

-- Every email the API sends, used for the daily sending limit.
create table public.email_log (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('invite', 'password_reset')),
  to_email text not null,
  sent_at timestamptz not null default now()
);
create index email_log_sent_at_idx on public.email_log (sent_at);

-- Helper for RLS. security definer so it can read profiles without recursing into RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'super_admin') and status = 'active'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Row level security: reads only. No insert, update or delete policies, so only the
-- service role (the API) can write.
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.tutors enable row level security;
alter table public.invitations enable row level security;
alter table public.email_log enable row level security;

create policy "Read own profile or any as admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Read own student record or any as admin" on public.students
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy "Read own tutor record or any as admin" on public.tutors
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins read invitations" on public.invitations
  for select to authenticated
  using ((select public.is_admin()));

create policy "Admins read email log" on public.email_log
  for select to authenticated
  using ((select public.is_admin()));

-- Token hashes are never exposed to browsers, even to admins: a table-level grant would
-- cover every column, so grant the readable columns explicitly instead.
revoke all on public.invitations from anon, authenticated;
grant select (id, profile_id, expires_at, used_at, status, attempts, last_sent_at, created_at)
  on public.invitations to authenticated;
revoke all on public.email_log from anon;
