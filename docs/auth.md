# Auth and user management

Status: built on `feat/auth` (2026-11-10). Architecture in `docs/infra.md`.

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
- Files: private `files` bucket, PDF/DOC/DOCX up to 10 MB, signed upload and download URLs from the API.
- Suspend bans the user in Supabase Auth and blocks the API; reactivate lifts the ban. Only a super_admin can change admins.

## Later
- Daily automatic sending of pending invites (today an admin presses "Send pending invites").
