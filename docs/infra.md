# Infrastructure (free tier only)

Decided 2026-11-10. No paid services. Cloudflare Workers, R2, Upstash, Cron Triggers and Playwright are out for now.

## Layout: pnpm monorepo
- `web/`: the Next.js site. `output: "export"`, served free as a **Render Static Site**. Every app page is client-side and talks to the API. Holds only public config (API URL, Supabase URL and anon key). Never the service role key.
- `api/`: Node + TypeScript + Express, a free **Render Web Service**. Holds the Supabase service role key and does all privileged work.

## Database and auth: Supabase (free)
- SQL migrations in `api/supabase/migrations`. Never edit the remote schema by hand.
- Public sign-ups off (also set this in the hosted project: Authentication > Sign In / Providers).
- RLS on every table; users read their own rows, admins read everything. All writes go through the API with the service role.

## Email: SMTP from our own domain
- `EMAIL_PROVIDER=smtp` works with any SMTP host: `SMTP_HOST`, `SMTP_PORT` (465 TLS, 587 STARTTLS), `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`. `resend` (with `RESEND_API_KEY`) and `console` also work. Empty: resend if a key is set, else console.
- `EMAIL_FROM="Crystal Entrepreneurship <noreply@domain>"` on every email; `EMAIL_REPLY_TO` is a mailbox someone reads.
- One module (`api/src/lib/email.ts`) with our own templates. Every email has a plain-text and an HTML part, no attachments, and at most one link (the action button).
- Every attempt is logged in `email_log` with its outcome (sent, failed, bounced). Sent and bounced count against the day's cap.
- Daily cap: `EMAIL_DAILY_LIMIT`, ramped up from `EMAIL_WARMUP_START` (days 1 to 2: 50, 3 to 4: 100, 5 to 6: 250, 7 to 8: 500, 9 to 10: 1000, then the limit, never above it). `EMAIL_RATE_PER_MINUTE` caps each minute.
- Outbox (`api/src/lib/outbox.ts`): activation emails (pending invitations) go first, then other queued emails (password resets, link created at send time, dropped after 24 hours). It runs every minute and straight after anything is queued.
- Bounces: only those the SMTP server refuses during the send are recorded. Later bounce messages arrive in the sending mailbox and must be checked there.
- `pnpm email:test you@address` sends one test email through the configured provider.
- The admin dashboard shows sent today against today's cap, queued counts, and failures and bounces from the last 24 hours.

## Rate limiting
- `express-rate-limit`, in memory, on login, activation and forgot password.

## Config
- One `.env.example` per app, checked with zod at start-up (API) or first use (web).

## Free tier notes
- A free Render Web Service sleeps after 15 minutes idle; the first request after that takes about a minute.
- In-memory rate limits reset when the API restarts or sleeps.
