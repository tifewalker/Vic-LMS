-- Compulsory programmes, and department and level on student records (client decision, 2026-11-24).
-- Every student is enrolled in the compulsory programmes and picks one other programme when registering.

alter table public.programmes
  add column if not exists is_compulsory boolean not null default false;

update public.programmes
  set is_compulsory = true
  where slug in ('entrepreneurship-and-business-development', 'information-technology-and-digital-productivity');

-- Department is free text for now (no fixed list yet). Level is 100 to 500.
-- Both nullable: students imported before this change, or by CSV without these columns, have none.
alter table public.students
  add column if not exists department text check (department is null or char_length(department) between 1 and 120),
  add column if not exists level smallint check (level is null or level in (100, 200, 300, 400, 500));
