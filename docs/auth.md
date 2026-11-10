# Auth design

Status: approved 2026-11-10. Decisions recorded at the end supersede the flow text where they differ.

## Database

- **profiles**: id (= auth.users.id), role, full_name, email, status (`invited` | `active` | `suspended`), created_at
- **students**: profile_id, matric_no (unique, normalised to uppercase and trimmed)
- **tutors**: profile_id, tutor_id (unique, generated from a sequence as `VEC-TUT-0001`)
- **invitations**: id, profile_id, status (`queued` | `sent` | `failed` | `activated` | `expired`), attempts, last_sent_at, error, created_by
- **invitation_tokens**: id, invitation_id, token_hash (SHA-256), expires_at (created + 72h), used_at, revoked_at, created_at
- **email_log**: every email we send (invite, password reset), used for the daily cap
- **import_batches**: id, file_name, uploaded_by, total, created, skipped, errors (jsonb), created_at
- RLS on every table. Users read their own profile. Tutors read students in their batches, once batches exist. Admins read everything.
- The role goes into the JWT through a Supabase custom access token hook and is read in RLS through a helper function.

## Flows

1. **Supabase settings**: public sign-ups disabled, email and password only, invite links expire after 72 hours.
2. **Bulk student upload (admin)**
   - Upload a .csv or .xlsx file with matric_no, full_name and email. Parse it on the server.
   - Show a preview table before anything is saved. Flag invalid emails, missing fields, duplicate rows in the file, and matric numbers or emails already in the system.
   - On confirm, create the auth users (unconfirmed), profiles, students and invitations (queued) in one server action, and record an import_batches row.
   - Provide a downloadable CSV template.
3. **Invite sender**
   - A job sends queued invitations using `supabase.auth.admin.generateLink({ type: "invite" })` and our own Resend email template.
   - It stays within a configurable daily cap (`EMAIL_DAILY_LIMIT`, default 90). Whatever is left over sends the next day.
   - Runs from a Cloudflare Cron Trigger, and from a "Send now" button for admins.
4. **Activation**: `/activate` receives the token, verifies it with `verifyOtp(token_hash)`, shows a "set your password" form with strength rules, marks the profile active and the invitation activated, then sends the user to their dashboard.
5. **Login** at `/login`
   - One field labelled "Email, matric number or tutor ID", plus a password.
   - Resolve the identifier to an email on the server, then call `signInWithPassword`.
   - The same error for every failure.
   - Rate limited by IP and by identifier.
   - "Forgot password" sends a reset email.
   - Invited users who have not activated see a "check your email or ask the admin to resend" message.
6. **Tutors**: an admin creates a tutor (name, email). The tutor_id is generated automatically. Same invite flow as students.
7. **Admin users page**
   - Tabs for Students, Tutors and Admins, with search and status filters.
   - A "Not activated" filter, "Resend invite" (single or bulk), suspend and reactivate.
   - Each user's invite attempts and last sent time.
8. **First admin**: `pnpm seed:admin` creates the super_admin from env vars. Only a super_admin can create other admins.
9. **Route protection**: `(platform)/admin`, `(platform)/tutor` and `(platform)/student` each check the role on the server and redirect if it is wrong. After login, users go to the dashboard for their role. Dashboards are placeholders for now.

## Design
Follows CLAUDE.md: paper, ink and clay palette, calm and plain. No em dashes in UI copy or emails.

## Testing
- Unit tests for CSV/XLSX validation and identifier resolution.
- One end-to-end test: upload, invite, activate, login, against local Supabase with Mailpit catching the emails.

## Decisions (2026-11-10)

1. **Own invitation tokens** (replaces `generateLink({ type: "invite" })` and `verifyOtp`).
   - 32 random bytes, sent in the link as base64url. Only a SHA-256 hash is stored. Expires 72 hours after creation.
   - Created when the email is actually sent, not when the invite is queued.
   - Single use. On use: mark it used, set the password through the admin API, confirm the email, mark the profile active and the invitation activated, sign the user in, redirect to their dashboard.
   - A resend revokes every earlier token for that invitation.
   - Expired or invalid token: a calm page saying to ask the admin to resend. It does not say which of the two it was.
2. **Login errors**: one generic error for every failure, always including the activation hint.
3. **Workers Free while building.**
   - CSV/XLSX is parsed in the browser (papaparse, read-excel-file), loaded only on the import page. The server receives validated JSON rows and validates them again.
   - Import runs in chunks of 20 rows (well under 50 outbound calls per request), with a progress bar. Every chunk is recorded against one import_batches row.
   - If something does not fit on Free, report the numbers; the client will move to Workers Paid rather than accept worse code.
4. **Email transport**: Resend in production, Mailpit SMTP locally. The local transport stays out of the Worker bundle.
5. **Password reset goes through our email layer too.**
   - `supabase.auth.admin.generateLink({ type: "recovery" })` on the server, sent with our React Email template through the same sender.
   - Every email is logged in email_log and counted in the daily cap. Supabase's own templates and SMTP are not used.
   - Forgot password is rate limited by IP and by email, and always answers "If an account exists, we've sent a reset link."
6. Suspended users are blocked in Supabase Auth (ban) and status is re-checked in the layouts. Layouts read the role from the database.
7. The Cron Trigger runs from a custom Worker entry alongside the OpenNext handler.
