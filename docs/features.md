# Feature Study: Victory Entrepreneurship Centre Training Platform

Source: `docs/proposal.md` (the client proposal). This file turns it into something we can build against.

## 1. What we are building

Two products in one codebase:

1. **Public website** (build first). Introduces the Centre and the OAUSTECH 26-week programme, and takes applications.
2. **Training Management Platform** (the LMS). Private app with three roles: Admin, Instructor, Learner.

Out of scope for the platform quote: the streaming setup ($500) and live-day support. The platform only **stores and shows** YouTube Live and replay links. No video hosting, no in-app streaming.

## 2. Roles

| Role | Can do |
|---|---|
| **Admin** | Review and approve applications, manage programmes and batches, assign learners and instructors, post announcements and materials, see all records and reports |
| **Instructor** | See only assigned batches and their learners, post announcements and instructions, upload materials, create assignments, mark paper submissions, record scores and feedback, add live and replay links |
| **Learner** | See own programme and batch, read announcements and reply, download materials, submit assignments, see own scores and feedback, open live and replay links |
| **Visitor** | Public site, programme info, apply |

## 3. Modules (mapped to proposal sections)

### 3.1 Public site and application (proposal 3.1)
- Landing page with programme info (content in `content/landing-copy.md`)
- Application form: personal details, contact, education background, chosen training area, motivation, availability for virtual and physical phases
- Submission confirmation screen and confirmation email
- Applications land in the admin queue

### 3.2 Learner management (3.2)
- Application statuses: `submitted`, `under_review`, `approved`, `rejected`, `waitlisted`
- Approving an application creates a learner account (invite email, learner sets password)
- Learner profile and record page: details, batch, submissions, scores, participation

### 3.3 Programmes and batches (3.3)
- Programme: name, description, duration, phases, training areas
- Batch: belongs to a programme, has a name (e.g. "Cohort 1, Jan 2027"), start date, end date, status
- Assign learners to a batch, assign one or more instructors to a batch

### 3.4 Instructor communication (3.4)
- Batch feed: announcements and instructions posted by instructors or admins
- Learners can comment or ask questions under a post
- Optional pinning of important posts
- Keep it a feed with threaded replies. No real-time chat in v1.

### 3.5 Learning materials (3.5)
- Upload files (PDF, slides, docs, images) or add links
- Attach to a programme (all batches) or a single batch
- Optional grouping by training area or week

### 3.6 Assignments (3.6)
- Fields: title, instructions, deadline, max score, submission mode (`digital` or `paper`)
- Digital: learner uploads a file or pastes text or a link
- Paper: instructor ticks "received" per learner, with date
- Submission status per learner: `not_submitted`, `submitted`, `late`, `received_paper`, `graded`
- Both modes show in one tracking table per assignment

### 3.7 Evaluation and progress (3.7)
- Score and written feedback per submission
- Other assessments not tied to an assignment (tests, practicals) with scores
- Learner progress view: assignments done, average score, feedback history
- Learners see only results the instructor has released

### 3.8 Learner dashboard (3.8)
One page showing: programme and batch, latest announcements, materials, upcoming deadlines, submission status, results and feedback, next live class link, replay links.

### 3.9 Admin dashboard and reports (3.9)
- Counts: applications by status, learners per batch, instructors, assignments, submission rates
- Basic reports with CSV export: applications, batch roster, submission status, scores per batch

### 3.10 Virtual classes (3.10)
- Live session: title, batch, date and time, YouTube Live URL, replay URL (added later)
- Shows on the learner dashboard as "upcoming", "live now", "replay available"
- Fits the 26-week plan: heavy use in weeks 1 to 6 (virtual phase), less in weeks 7 to 26

## 4. Data model (first draft)

```
profiles            id, role (admin|instructor|learner), full_name, phone, email, avatar_url
applications        id, programme_id, training_area, personal fields..., status, reviewed_by, reviewed_at, notes
programmes          id, name, slug, description, duration_weeks, is_open
training_areas      id, programme_id, title, order
batches             id, programme_id, name, start_date, end_date, status
batch_learners      batch_id, learner_id, joined_at
batch_instructors   batch_id, instructor_id
posts               id, batch_id, author_id, title, body, pinned, created_at
post_comments       id, post_id, author_id, body, created_at
materials           id, programme_id?, batch_id?, title, file_path | url, week?, uploaded_by
assignments         id, batch_id, title, instructions, deadline, max_score, mode (digital|paper)
submissions         id, assignment_id, learner_id, file_path?, text?, link?, status, submitted_at, received_at
evaluations         id, learner_id, batch_id, assignment_id?, title, score, max_score, feedback, released
live_sessions       id, batch_id, title, starts_at, live_url, replay_url
```

Access rule of thumb: instructors see rows where they are in `batch_instructors`, learners see rows where they are in `batch_learners`, admins see everything. Enforce this in the database (Supabase RLS), not just in the UI.

## 5. Build order

1. **Landing page** (now)
2. Application form plus admin application queue
3. Auth and roles, approve to learner account
4. Programmes, batches, assignments of people
5. Batch feed and materials
6. Assignments and submissions (digital and paper)
7. Evaluations and progress
8. Learner dashboard, live session links
9. Admin dashboard and reports
10. Polish, accessibility, testing, deployment

## 6. Questions for the client

- Whose brand leads the public site: Victory Entrepreneurship Centre, OAUSTECH, or both side by side? Do we have logos?
- Do we have real photos of the campus and past sessions? (Big difference to the design.)
- Application dates, fees, certificate details and final tracks: the copy says these still need confirming.
- Keep the Google Form for now, or switch straight to the in-platform form?
- Email sender domain for confirmation and invite emails.
- Can a learner be in more than one batch or programme?
