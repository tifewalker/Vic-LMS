# Infrastructure

## Database, auth and RLS: Supabase
- Local development with the Supabase CLI.
- Every schema change is a migration in `supabase/migrations`. Never edit the remote schema by hand.

## Hosting: Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- Remove `output: "export"` and `images.unoptimized` from the landing page setup. The landing page must still prerender as static.
- Check that the Next.js 16 proxy file (formerly middleware) works under OpenNext. If it does not, protect routes with server-side checks in the `(platform)` layouts instead, and report it.
- After building, report the compressed Worker size. If it is over 3 MiB, report it. Do not hack around it.

## File storage: Cloudflare R2
- Materials and submissions, uploaded with presigned URLs.
- Postgres stores only the file keys.

## Email: Resend
- Our own templates (React Email), sent through our own email layer for every email (invites and password resets).
- Supabase's email templates and SMTP are not used. Every send is logged in `email_log` and counted against `EMAIL_DAILY_LIMIT`.
- Local development sends to Mailpit over SMTP; that transport is kept out of the Worker bundle.

## Rate limiting: Upstash Redis
- Login, invite resend and bulk upload endpoints.

## Config
- Environment variables only, loaded through a typed env loader (zod), with a `.env.example`.
- The Supabase service role key is only ever used on the server.

## Workers plan
- Building on **Workers Free**: 10 ms CPU per request, 50 outbound calls per request, 3 MiB compressed Worker.
- Designs that respect this: browser-side file parsing, import in chunks of 20 rows.
- If a limit does not fit, report the measured numbers; the client will move to Workers Paid ($5/month) rather than accept worse code.
- The Cron Trigger runs from a custom Worker entry alongside the OpenNext handler.
