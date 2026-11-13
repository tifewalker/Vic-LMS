# CLAUDE.md

Project: website and Training Management Platform (LMS) for Crystal Entrepreneurship Centre, starting with the public site for the OAUSTECH Entrepreneurship, ICT, Digital Skills and Emerging Technologies Training Programme (26 weeks, Okitipupa, Ondo State).

Read these first:
- `docs/scope-v2.md`: the ten modules, exclusions and roles (student, tutor, admin, super_admin). Supersedes the module list in `features.md`.
- `docs/infra.md`: free-tier setup: `web/` (Next.js static export on Render) + `api/` (Express on Render), Supabase, email over SMTP (or Resend)
- `docs/auth.md`: auth and user management design (current phase)
- `docs/features.md`: original feature study, data model draft
- `docs/proposal.md`: original client proposal (kept as written; uses "learner" and "instructor")
- `content/landing-copy.md`: approved landing page copy

## Current phase

**Phase 2: Auth and user management** (`docs/auth.md`), on the `feat/auth` branch. Free services only. Phase 1 (the landing page) is done and must keep prerendering as static.

Terminology: use **student** and **tutor** in code, UI and docs, never "learner" or "instructor".

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS with design tokens defined once (CSS variables plus Tailwind theme)
- `next/font` for fonts
- pnpm monorepo: `web/` (this Next.js site, `output: "export"`) and `api/` (Express + TypeScript). Supabase (Postgres, Auth, RLS) with migrations in `api/supabase/migrations`; email over SMTP from our own domain (Resend also supported). See `docs/infra.md`.
- The web app never holds the Supabase service role key; privileged work goes through the API.
- Package manager: pnpm
- No UI kit for the landing page. Hand-built components.

Suggested layout:
```
web/src/app/(marketing)/page.tsx      landing
web/src/app/(marketing)/layout.tsx
web/src/app/(platform)/...            admin, tutor, student, plus (auth) for login and activation
api/src/...                           Express API
web/src/components/marketing/...      landing sections
web/src/components/ui/...             buttons, links, accordion
web/src/content/landing.ts            copy as typed data, pulled from content/landing-copy.md
web/src/lib/site.ts                   phone, form link, address, urls
```

## Content rules

- Use the copy in `content/landing-copy.md`. Do not invent claims, numbers, testimonials, partner logos or statistics.
- **No em dashes (—) anywhere**, in copy, alt text, metadata or code comments that render. Use a full stop, comma, colon or "to" (e.g. "Weeks 1 to 6" or the en dash range "1–6").
- No filler marketing phrases such as "unlock your potential", "in today's fast-paced world", "seamless", "cutting-edge", "elevate", "journey", "empower" unless they are already in the approved copy.
- No emoji in the UI.
- Keep the British spelling used in the copy (programme, organise, visualisation).
- Items the copy marks "to be confirmed" (dates, fees, certificates) must not be shown as facts. Hide them or show "Details to be announced".
- Phone: +234 703 203 8565 (make it a `tel:` link). Applications for this cohort are closed: the site's calls to action are Log in (`/login/`) and Activate your account (`/activate-account/`), both kept in `web/src/lib/site.ts`. Do not add Apply links.

## Design direction: sweet and neutral, not "AI template"

The feel: a well-made printed prospectus from a good university. Warm paper, calm ink, one soft accent. Editorial, quiet, confident.

### Do not use
- Gradient blobs, glowing orbs, floating circles, decorative rings or dotted circle patterns
- Purple, indigo or neon gradients, gradient text
- Glassmorphism, frosted cards, heavy drop shadows
- A grid of identical rounded cards each with an icon in a coloured circle on top
- Pill badges above every heading ("✨ New", "Why us")
- Big rounded-full buttons with arrow icons everywhere
- Stock "3 columns of features with icons" as the default answer to every section
- Fake dashboard screenshots, fake stats ("10k+ students")
- Lottie or bouncy animations, parallax, cursor effects

### Do use
- **Palette (starting point, tune if needed):**
  - `--paper` #F5F1E8 (page background)
  - `--paper-2` #ECE5D7 (alternate section background)
  - `--ink` #1F1D1A (text)
  - `--ink-muted` #5F5A51 (secondary text)
  - `--line` #D8D0C0 (hairline rules and borders)
  - `--accent` #A0573B (warm clay, for links, buttons, small highlights)
  - `--accent-soft` #E9D6C9
  - `--sage` #6E7B63 (sparing second accent, e.g. Phase Two)
- **Type:** a readable serif for headings (e.g. Newsreader or Source Serif 4) and a plain sans for body and UI (e.g. Public Sans or Instrument Sans). Large, well-spaced headings, comfortable body size (17 to 18px), max line length around 68ch.
- **Structure:** hairline rules (1px `--line`) to separate content, short kickers instead of section numbers (client removed the 01, 02... section tags), generous whitespace, left-aligned text, a clear grid. Asymmetry is fine.
- **Corners:** small radius (2 to 6px) or square. No pills except maybe tiny tags.
- **Imagery:** real photos only, with no visible captions or credit lines (alt text only; credits are kept in `web/public/images/CREDITS.md`). Until then use plain neutral placeholders with a caption like "Campus photo", not illustrations or AI images.
- **Motion:** subtle fade or rise on scroll at most, under 300ms, and off under `prefers-reduced-motion`.

### Landing page sections (in this order)
1. **Hero:** big serif headline "26 Weeks to Learn. Build. Innovate. Become an Entrepreneur.", short intro, Log in button plus an Activate your account text link and Enquire (phone), location line. One real photo from Crystal's past trainings.
2. **About:** intro paragraphs on the left; on the right one numbered list of six benefits ("Why participate" and "What you can expect to gain" merged) and one line on who it is for.
3. **Programme structure:** a horizontal 26-week ruler/timeline, weeks 1 to 6 marked "Virtual" and 7 to 26 marked "Physical and practical at OAUSTECH". Stacks vertically on mobile. This is the visual centrepiece.
4. **Training areas (8):** an index list (01 to 08) like a book's table of contents. Each row expands (accordion) to show its photo, topics and one short "What you will gain" line. Not a card grid.
5. **Who's behind the programme** (`#about-us`): Crystal Entrepreneurship Centre and OAUSTECH (motto set large, campus gate photo) side by side, then a "From our past trainings" gallery with a lightbox (a horizontal snap strip on mobile).
6. **FAQ:** accordion, six questions.
7. **Final call to action and footer:** Already registered? Log in, activate link, contact, university website, location.

Removed for good (applications are closed): eligibility, the separate "Who should participate", "What you can expect to gain", "Why OAUSTECH" and "Programme in pictures" sections, and the certificate question.

## Branding and images

### Branding: both brands, side by side
- OAUSTECH is the host institution. Crystal Entrepreneurship Centre runs the programme.
- **Header:** OAUSTECH logo and the Crystal Entrepreneurship Centre name side by side, separated by a thin vertical rule (1px `--line`).
- **Footer:** include the line "Delivered by Crystal Entrepreneurship Centre in partnership with OAUSTECH".
- There is no Crystal Entrepreneurship Centre logo yet. Set the name in the heading serif as a wordmark and keep a `TODO(content):` for the real logo until the client supplies one.

### Images: real photos, self-hosted
- Use real images from the OAUSTECH website, downloaded into `web/public/images/` and served with `next/image`. Never hotlink.
  - Logo: https://oaustech.edu.ng/images/logo.png to `web/public/images/oaustech-logo.png`
  - Campus photo: https://oaustech.edu.ng/cache/resized/0930ca64ead13e2113232a6df145a9c7.jpg to `web/public/images/oaustech-campus.jpg` (About us section)
  - Auditorium: https://oaustech.edu.ng/cache/resized/e5032fe998fcdad7d034560cc740340a.jpg to `web/public/images/oaustech-auditorium.jpg` (not used at present)
  - Library: https://oaustech.edu.ng/cache/resized/25409442948fc7b1a29bf29244f3c3f6.jpg to `web/public/images/oaustech-library.jpg` (not used at present)
- If a download fails, use a neutral placeholder captioned "Campus photo" and report it. Never substitute stock photos or AI images.
- Write proper, descriptive alt text. No em dashes in alt text.
- Crystal's own training photos (client supplied) live in `web/public/images/crystal/` as WebP; originals stay out of the build in `web/assets/photo-originals/`. Prefer them over stock photos wherever one fits. Pexels stock remains only for training areas with no matching real photo.
- Photos have square corners, a hairline frame, no filters or overlays and no visible captions.
- Register every photo in one place (`web/src/content/images.ts`) rather than hard-coding paths in components.

## Quality bar

- Mobile first, test at 360px, 768px, 1280px
- Semantic HTML, one `h1`, visible focus states, accessible accordions (button + `aria-expanded`), colour contrast AA
- Lighthouse 95+ on performance and accessibility
- SEO: title, description, Open Graph, `lang="en-GB"`
- No layout shift from fonts or images

## Working style

- Small commits with clear messages
- After building a section, run the dev server and check it at mobile and desktop widths
- If something in the copy is unclear or missing, leave a `TODO(content):` comment and list it in your summary instead of inventing text
