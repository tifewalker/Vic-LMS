-- Class reminders without email (2026-11-25):
-- * A private calendar feed per user: calendar apps cannot sign in, so the link carries a secret token.
-- * Browser push notifications, one hour before each class.
-- Only the API (service role) reads or writes these tables, so RLS is on with no policies.

create table if not exists public.calendar_tokens (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null unique check (char_length(token) >= 32),
  created_at timestamptz not null default now()
);
alter table public.calendar_tokens enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);
alter table public.push_subscriptions enable row level security;

-- Set when the reminder for a class has gone out; cleared when the class is moved.
alter table public.classes
  add column if not exists reminder_sent_at timestamptz;
