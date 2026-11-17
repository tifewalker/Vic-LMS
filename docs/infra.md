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

> **Not in use since 2026-11-17.** The platform sends no email (see the note at the top of `docs/auth.md`). The outbox no longer runs; `lib/email.ts`, `lib/outbox.ts` and `pnpm email:test` are kept in case email is turned back on. The rest of this section describes that setup.
- `EMAIL_PROVIDER=smtp` works with any SMTP host: `SMTP_HOST`, `SMTP_PORT` (465 TLS, 587 STARTTLS), `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`. `resend` (with `RESEND_API_KEY`) and `console` also work. Empty: resend if a key is set, else console.
- `EMAIL_FROM="Crystal Entrepreneurship <noreply@domain>"` on every email; `EMAIL_REPLY_TO` is a mailbox someone reads.
- One module (`api/src/lib/email.ts`) with our own templates. Every email has a plain-text and an HTML part, no attachments, and at most one link (the action button).
- Every attempt is logged in `email_log` with its outcome (sent, failed, bounced). Sent and bounced count against the day's cap.
- Daily cap: `EMAIL_DAILY_LIMIT`, ramped up from `EMAIL_WARMUP_START` (days 1 to 2: 50, 3 to 4: 100, 5 to 6: 250, 7 to 8: 500, 9 to 10: 1000, then the limit, never above it). `EMAIL_RATE_PER_MINUTE` caps each minute.
- Outbox (`api/src/lib/outbox.ts`): activation emails (pending invitations) go first, then other queued emails (password resets, link created at send time, dropped after 24 hours). It runs every minute and straight after anything is queued.
- Bounces: only those the SMTP server refuses during the send are recorded. Later bounce messages arrive in the sending mailbox and must be checked there.
- `pnpm email:test you@address` sends one test email through the configured provider.
- The admin dashboard shows sent today against today's cap, queued counts, and failures and bounces from the last 24 hours.

## Live classes: YouTube inside the app
- Students watch the class in the app, in a `youtube-nocookie.com` embed. Tutors and admins teach on Zoom; students never see Zoom.
- **Streams and recordings must be Unlisted, not Private**, and **embedding must be allowed** (YouTube Studio > the video > Details > Show more > Allow embedding). A Private video or one with embedding off shows an error in the player; the "Open on YouTube" link under it is the fallback.
- Admins paste any YouTube link (watch, youtu.be, /live/, embed). The API stores the video ID (`youtube_id`, `recording_id`) next to a canonical watch link.
- The player loads only from 10 minutes before the start, or when a student taps, to save data.
- `live_mode` per class: `realtime` (Supabase Realtime) or `light` (Q&A and polls refresh every 25 seconds, no open connection). Tutors and admins always get realtime.
- Poll changes and votes send a content-free broadcast on `polls:class:<id>`; pages then reload counts from the API (students cannot read each other's votes).

## Rate limiting
- `express-rate-limit`, in memory, on login, activation and forgot password.

## Config
- One `.env.example` per app, checked with zod at start-up (API) or first use (web).

## Free tier notes
- A free Render Web Service sleeps after 15 minutes idle; the first request after that takes about a minute.
- In-memory rate limits reset when the API restarts or sleeps.
