# Scope v2: Crystal Entrepreneurship Centre Training Platform

Supersedes the module list in `docs/features.md` where they differ. `features.md` still holds the data model draft and the original module notes.

## Modules

1. **Public website**: the landing page (built in Phase 1).
2. **Auth and user management**: invite-only accounts, login, password reset, admin user management. See `docs/auth.md`.
3. **Bulk student registration**: CSV/XLSX upload with preview and validation, then invitations.
4. **Programmes and batches**: programmes, batches, assigning students and tutors.
5. **Learning management**: batch feed, announcements, learning materials.
6. **Virtual classes**: YouTube Live / OBS stream links, optional Zoom link, a "Join Lecture" button.
7. **Assignments and assessments**: digital and paper submissions, rubrics, auto-grading of objective questions (later).
8. **Results and progress**: gradebook, exports.
9. **Dashboards and analytics**: attendance, basic engagement.
10. **Security, deployment, handover**.

## Excluded

- SSO, university identity, Azure AD, Google login
- Syncing with the university's systems
- Teams or Zoom broadcast architecture
- Concurrency guarantees

## Roles

| Role | Notes |
|---|---|
| `student` | Formerly "learner". |
| `tutor` | Formerly "instructor". Use "tutor" in code and UI. |
| `admin` | Manages users, programmes, batches. |
| `super_admin` | Everything an admin can do, plus creating other admins. |
