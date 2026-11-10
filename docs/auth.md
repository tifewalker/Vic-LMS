# Auth and user management

Status: built on `feat/auth` (2026-11-10). Architecture in `docs/infra.md`.

## Database (`api/supabase/migrations`)
- **profiles**: id (= auth.users.id), role (student | tutor | admin | super_admin), full_name, email, status (invited | active | suspended), created_at
- **students**: profile_id, matric_no (unique, trimmed, uppercase)
- **tutors**: profile_id, tutor_id (unique, VEC-TUT-0001 from a sequence)
- **invitations**: id, profile_id, token_hash, expires_at, used_at, status (pending | sent | activated | expired), attempts, last_sent_at, created_at
- **email_log**: every email the API sends, for the daily limit
- RLS: users read their own profile and role record; admins read everything; token hashes are never readable from the browser. All writes go through the API.

## Invitation tokens
- 32 random bytes, base64url, in the link `{WEB_URL}/activate/?token=...`. Only the SHA-256 hash is stored.
- Created when the email is sent; expires 72 hours later; single use.
- Resend writes a new hash, so the old link stops working.
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
| `POST /admin/invitations/:id/resend` | New token; queued as pending if today's limit is used up. |
| `POST /admin/tutors` | Creates a tutor with a generated tutor ID and sends the invite. |
| `POST /admin/admins` | super_admin only. |
| `GET /admin/users?role=&status=&q=&page=` | Paginated, with invite status, attempts and last sent time. |

`pnpm seed:admin` creates the first super_admin from `SEED_ADMIN_*` env vars.

## Web pages
`/login`, `/activate`, `/forgot-password`, `/reset-password`, `/admin`, `/admin/users`, `/admin/users/import`, `/admin/users/tutors/new`, `/admin/users/admins/new`, `/tutor`, `/student`. A client-side guard checks `/me` and redirects by role; the API enforces access on every request.

## Later
- Suspend and reactivate actions (status exists; no endpoint yet).
- Daily automatic sending of pending invites (today an admin presses "Send pending invites").
