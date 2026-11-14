-- Email delivery: outcome of every send, plus a queue for emails other than activation.
-- Activation emails are queued as invitations with status 'pending' (see invitations).

-- email_log now records failures and bounces too. Only 'sent' and 'bounced' count against the
-- daily cap, because both reached the mail server.
alter table public.email_log
  add column status text not null default 'sent' check (status in ('sent', 'failed', 'bounced')),
  add column error text check (error is null or length(error) <= 500),
  add column provider text;

alter table public.email_log drop constraint email_log_kind_check;
alter table public.email_log add constraint email_log_kind_check check (kind in ('invite', 'password_reset', 'test'));

create index email_log_problems_idx on public.email_log (sent_at) where status <> 'sent';

-- Other emails wait here when the cap or the rate limit is reached. The link is created at send time,
-- so a queued password reset never carries a link that expired while it waited.
create table public.email_queue (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('password_reset')),
  to_email text not null check (to_email = lower(btrim(to_email))),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'dropped')),
  attempts integer not null default 0,
  last_error text check (last_error is null or length(last_error) <= 500),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
-- At most one queued email of each kind per address.
create unique index email_queue_one_queued_idx on public.email_queue (kind, to_email) where status = 'queued';
create index email_queue_queued_idx on public.email_queue (created_at) where status = 'queued';

alter table public.email_queue enable row level security;
create policy "Admins read email queue" on public.email_queue
  for select to authenticated using (public.is_admin());
revoke all on public.email_queue from anon;
