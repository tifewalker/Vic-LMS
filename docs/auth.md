# Auth and user management

Status: built on `feat/auth` (2026-11-10). Architecture in `docs/infra.md`.

> **Changed 2026-11-17 (client decision): no activation and no email.** Accounts are created active and can sign in straight away.
> - Self-registration (added 2026-11-23): `/register/` takes full name, email, matric number and one or more programmes. `GET /auth/programmes` lists active programmes; `POST /auth/register` validates with the import rules (plus matric characters `A-Z 0-9 / - .`), creates the student active with the matric number as password and enrols them. No approval step and no email; the page shows the login details on success. Rate limited to 40 per 15 minutes per address (campus networks share one). Students can log in with their email or matric number; for student accounts the login tries the password in matric form (uppercase, no spaces) once.
> - Changed 2026-11-24: `programmes.is_compulsory` (Entrepreneurship and Business Development; Information Technology and Digital Productivity). Registration takes `department` (free text, up to 120 characters), `level` (100 to 500) and exactly one non-compulsory `programme_id`; the student is enrolled in that one plus every active compulsory programme. CSV import enrols in the compulsory programmes too and accepts optional `department` and `level` columns (`300`, `300L` or `300 Level`). Both columns are nullable on `students`.
> - Changed 2026-11-25 (meeting with the school management): programmes are called **courses** in the UI (tables, routes and API fields keep the `programme` names). Every student takes every active course: registration and import enrol into all active courses, and a new active course enrols every existing student. `is_compulsory` is unused (kept so an old API keeps working; drop it later). `programmes.sort_order` (0 = the main course, Entrepreneurship, listed first). Registration takes `phone` (stored as `+234...` when typed the local way) and `sex` (`male` or `female`), both required there and optional on import (`phone`, `sex` columns). `students.matric_no` holds the matric number, or the registration number for 100 Level students who have none yet; either is the login and first password. Timetable: Wednesdays 2 pm to 6 pm, Saturdays when needed (`web/src/lib/timetable.ts`): new classes default to the next Wednesday slot and the class form warns, without blocking, when a class is outside it. Students see their classes as "Timetable". Later the same day: there is one course, **Entrepreneurship and Innovation** (the old Entrepreneurship and Business Development row, renamed); the eight training areas are its outline (`programmes.outline text[]`, edited one per line on the admin Courses page), and each class can name its topic (`classes.topic`). The other seven course rows are switched off, not deleted (migration `20261125010000_one_course_outline`).
> - Class reminders (2026-11-25), since no email or SMS is sent: (1) a private calendar feed per user, `GET /calendar/<token>.ics` (token in `calendar_tokens`; `GET /me/calendar`, `POST /me/calendar/reset`), each class with a 60-minute alarm; (2) Web Push (`web-push`, VAPID keys in env): `web/public/sw.js`, `POST/DELETE /me/push`, `POST /me/push/test`, and a once-a-minute loop in the API (`lib/reminders.ts`) that pushes to the course's students and tutors about an hour before each class (`classes.reminder_sent_at`, cleared when a class is moved). Both are on the student Timetable and tutor Classes pages. iPhones need the site added to the Home Screen first (`app/manifest.ts`).
> - Students: created by import or self-registration; their first password is their matric number (stored trimmed and uppercase; the login also accepts it in any case and with stray spaces). Matric numbers need at least 6 characters for this.
> - Tutors and admins: the admin sets the password on the Add tutor / Add admin form.
> - Resets: `POST /admin/users/:id/password` from the Users page. A student with no password given goes back to their matric number; tutors and admins get the password the admin types. Only a super_admin changes an admin's password.
> - Removed: `/auth/activate`, `/auth/forgot-password`, `/auth/request-activation`, `/admin/invitations/*`, the `/activate`, `/activate-account`, `/forgot-password` and `/reset-password` pages, and the email outbox timer. The `invitations`, `email_log` and `email_queue` tables stay in the schema but are no longer written.
>
> The sections below describe the original invitation design and are kept for reference.

## Database (`api/supabase/migrations`)
- **profiles**: id (= auth.users.id), role (student | tutor | admin | super_admin), full_name, email, status (invited | active | suspended), created_at
- **students**: profile_id, matric_no (unique, trimmed, uppercase)
- **tutors**: profile_id, tutor_id (unique, VEC-TUT-0001 from a sequence)
- **invitations**: id, profile_id, token_hash, expires_at, used_at, status (pending | sent | activated | expired), attempts, last_sent_at, created_at
- **email_log**: every email the API tries to send, with its outcome (sent, failed, bounced), for the daily cap
- **email_queue**: emails other than activation waiting for the cap (password resets)
- RLS: users read their own profile and role record; admins read everything; token hashes are never readable from the browser. All writes go through the API.

## Invitation tokens
- 32 random bytes, base64url, in the link `{WEB_URL}/activate/?token=...`. Only the SHA-256 hash is stored.
- Created when the email is sent; expires 72 hours later; single use.
- Resend writes a new hash once the new email has gone, so the old link stops working then (it keeps working while the new one is queued).
- `POST /auth/request-activation` (from `/activate-account/`) queues a new link for an account that is not active yet. Same reply whether or not the account exists.
- Invalid or expired links show one message: "This link is no longer valid. Ask the admin to send a new one."

## API
| Endpoint | Notes |
|---|---|
| `POST /auth/login` | identifier = email, matric number or tutor ID. One generic error: "Incorrect details. If you were recently invited, check your email for your activation link." Rate limited by IP and identifier. |
| `GET /auth/activate/:token` | `{ valid, first_name }`. Does not use up the token. |
| `POST /auth/activate` | Claims the token, sets the password, confirms the email, marks the user active, returns a session. |
| `POST /auth/forgot-password` | Always "If an account exists, we've sent a reset link." Recovery link from `generateLink`, sent through our email module. |
| `GET /me` | Verifies the Bearer token, loads the profile. Suspended users get 403. |
| `GET /admin/summary` | Dashboard numbers. |
| `POST /admin/students/import` | Validated rows; per-row created, skipped and errors; then sends invites within today's limit. |
| `POST /admin/invitations/send-pending` | Sends pending invites within today's limit. |
| `POST /admin/invitations/:id/resend` | New token; queued as pending if today's cap or the per-minute rate is used up, then sent automatically. |
| `POST /admin/tutors` | Creates a tutor with a generated tutor ID and sends the invite. |
| `POST /admin/admins` | super_admin only. |
| `GET /admin/users?role=&status=&q=&page=` | Paginated, with invite status, attempts and last sent time. |

`pnpm seed:admin` creates the first super_admin from `SEED_ADMIN_*` env vars.

## Web pages
`/login`, `/activate`, `/forgot-password`, `/reset-password`, `/admin`, `/admin/users`, `/admin/users/import`, `/admin/users/tutors/new`, `/admin/users/admins/new`, `/tutor`, `/student`. A client-side guard checks `/me` and redirects by role; the API enforces access on every request.

## Programmes and classes (feat/batches)
Migration `20261112000000_programmes_classes.sql` replaced the earlier batch model.
- **Programme** = one course (8 seeded, one per training area). Students and tutors are enrolled per programme.
- **Class** = one scheduled session in a programme, with YouTube and recording links. Zoom link and passcode live in `class_tutor_links`, readable only by the programme's tutors and admins, and never returned by `/student` routes.
- Threads and replies (programme-wide or per class), live Q&A messages, assessments (digital or paper, optional PDF/Word brief), submissions (one per student, resubmit until graded, late after the deadline) and grades (hidden from students until released).
- RLS: a user reads a programme's rows only if enrolled as a student or tutor, or an admin. Students read only their own submissions and released grades. All writes go through the API.
- Realtime on `live_messages`, `threads` and `replies`; the web app subscribes directly and RLS applies.
- Polls per class (`polls`, `poll_options`, `poll_votes`, one vote per student): enrolled users read polls and options (drafts only tutors and admins); students read only their own vote. All writes go through the API. Live Q&A messages can be pinned by tutors and admins, and replies point at the message they answer (`reply_to`).
- Files: private `files` bucket, PDF/DOC/DOCX up to 10 MB, signed upload and download URLs from the API.
- Suspend bans the user in Supabase Auth and blocks the API; reactivate lifts the ban. Only a super_admin can change admins.

## Later
- Daily automatic sending of pending invites (today an admin presses "Send pending invites").
