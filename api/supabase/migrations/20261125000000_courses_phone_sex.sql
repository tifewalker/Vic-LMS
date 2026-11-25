-- Meeting with the school management (2026-11-25):
-- * "Programmes" are called courses in the platform (the tables keep their names).
-- * Every student takes every course. Entrepreneurship is the main course and is listed first.
-- * Registration also asks for a phone number and sex.
-- * 100 Level students have no matric number yet: matric_no holds the matric number or the
--   registration number, whichever the student has. Both are their login and first password.

alter table public.students
  add column if not exists phone text check (phone is null or phone ~ '^\+?[0-9]{7,15}$'),
  add column if not exists sex text check (sex is null or sex in ('male', 'female'));

-- Lower comes first; ties are sorted by title.
alter table public.programmes
  add column if not exists sort_order smallint not null default 100;

update public.programmes
  set sort_order = 0
  where slug = 'entrepreneurship-and-business-development';

-- is_compulsory is no longer used (everyone takes every course). It is kept for now so an API
-- that has not been redeployed yet keeps working; drop it in a later migration.
comment on column public.programmes.is_compulsory is 'Unused since 2026-11-25: every student takes every active course.';

-- Enrol every existing student in every active course.
insert into public.programme_students (programme_id, student_id)
  select p.id, s.profile_id
  from public.programmes p cross join public.students s
  where p.is_active
  on conflict (programme_id, student_id) do nothing;
