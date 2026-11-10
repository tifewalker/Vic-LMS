# Infrastructure (free tier only)

Decided 2026-11-10. No paid services. Cloudflare Workers, R2, Upstash, Cron Triggers and Playwright are out for now.

## Layout: pnpm monorepo
- `web/`: the Next.js site. `output: "export"`, served free as a **Render Static Site**. Every app page is client-side and talks to the API. Holds only public config (API URL, Supabase URL and anon key). Never the service role key.
- `api/`: Node + TypeScript + Express, a free **Render Web Service**. Holds the Supabase service role key and does all privileged work.

## Database and auth: Supabase (free)
- SQL migrations in `api/supabase/migrations`. Never edit the remote schema by hand.
- Public sign-ups off (also set this in the hosted project: Authentication > Sign In / Providers).
- RLS on every table; users read their own rows, admins read everything. All writes go through the API with the service role.

## Email: Resend (free, 100 a day)
- Sent from the API through one module with our own templates. Every send is logged in `email_log` and counted against `EMAIL_DAILY_LIMIT` (default 90).
- Locally, without `RESEND_API_KEY`, emails are printed to the API console.
- Resend only delivers to other people from a verified domain.

## Rate limiting
- `express-rate-limit`, in memory, on login, activation and forgot password.

## Config
- One `.env.example` per app, checked with zod at start-up (API) or first use (web).

## Free tier notes
- A free Render Web Service sleeps after 15 minutes idle; the first request after that takes about a minute.
- In-memory rate limits reset when the API restarts or sleeps.
