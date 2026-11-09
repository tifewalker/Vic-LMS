# CLAUDE.md

Project: website and Training Management Platform (LMS) for Victory Entrepreneurship Centre, starting with the public site for the OAUSTECH Entrepreneurship, ICT, Digital Skills and Emerging Technologies Training Programme (26 weeks, Okitipupa, Ondo State).

Read these first:
- `docs/features.md`: what we are building, roles, data model, build order
- `docs/proposal.md`: original client proposal
- `content/landing-copy.md`: approved landing page copy

## Current phase

**Phase 1: Landing page only.** Do not scaffold the dashboards, auth or database yet. Structure the code so the app can grow into them later (route groups, shared components).

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS with design tokens defined once (CSS variables plus Tailwind theme)
- `next/font` for fonts
- Later phases: Supabase (Postgres, Auth, Storage, RLS)
- Package manager: pnpm
- No UI kit for the landing page. Hand-built components.

Suggested layout:
```
src/app/(marketing)/page.tsx      landing
src/app/(marketing)/layout.tsx
src/app/(platform)/...            later: admin, instructor, learner
src/components/marketing/...      landing sections
src/components/ui/...             buttons, links, accordion
src/content/landing.ts            copy as typed data, pulled from content/landing-copy.md
src/lib/site.ts                   phone, form link, address, urls
```

## Content rules

- Use the copy in `content/landing-copy.md`. Do not invent claims, numbers, testimonials, partner logos or statistics.
- **No em dashes (—) anywhere**, in copy, alt text, metadata or code comments that render. Use a full stop, comma, colon or "to" (e.g. "Weeks 1 to 6" or the en dash range "1–6").
- No filler marketing phrases such as "unlock your potential", "in today's fast-paced world", "seamless", "cutting-edge", "elevate", "journey", "empower" unless they are already in the approved copy.
- No emoji in the UI.
- Keep the British spelling used in the copy (programme, organise, visualisation).
- Items the copy marks "to be confirmed" (dates, fees, certificates) must not be shown as facts. Hide them or show "Details to be announced".
- Phone: +234 703 203 8565 (make it a `tel:` link). Application form: https://forms.gle/DKMJPQvVLbwWSsbeA (keep in `src/lib/site.ts` so we can swap it for our own form later).

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
- Fake dashboard screenshots, fake stats ("10k+ learners")
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
- **Structure:** hairline rules (1px `--line`) to separate content, numbered sections (01, 02...), generous whitespace, left-aligned text, a clear grid. Asymmetry is fine.
- **Corners:** small radius (2 to 6px) or square. No pills except maybe tiny tags.
- **Imagery:** real photos only, supplied by the client. Until then use plain neutral placeholders with a caption like "Campus photo", not illustrations or AI images.
- **Motion:** subtle fade or rise on scroll at most, under 300ms, and off under `prefers-reduced-motion`.

### Section ideas (from the copy)
- **Hero:** big serif headline "26 Weeks to Learn. Build. Innovate. Become an Entrepreneur.", short intro, Apply button plus Enquire (phone) as a text link, location line. Room for one real photo.
- **About:** two-column text, intro on the left, "Why participate" as a numbered list with short descriptions on the right.
- **Programme structure:** a horizontal 26-week ruler/timeline, weeks 1 to 6 marked "Virtual" and 7 to 26 marked "Physical and practical at OAUSTECH". Stacks vertically on mobile. This is the visual centrepiece.
- **Training areas (8):** an index list (01 to 08) like a book's table of contents. Each row expands (accordion) to show topics and "What you will gain". Not a card grid.
- **Who should participate and eligibility:** two plain lists side by side.
- **What you can expect to gain:** a simple ruled list.
- **Why OAUSTECH:** short text with the motto set large as a quote.
- **FAQ:** accordion.
- **Final call to action and footer:** contact, form link, university website, location.

## Branding and images

### Branding: both brands, side by side
- OAUSTECH is the host institution. Victory Entrepreneurship Centre runs the programme.
- **Header:** OAUSTECH logo and the Victory Entrepreneurship Centre name side by side, separated by a thin vertical rule (1px `--line`).
- **Footer:** include the line "Delivered by Victory Entrepreneurship Centre in partnership with OAUSTECH".
- There is no Victory Entrepreneurship Centre logo yet. Set the name in the heading serif as a wordmark and keep a `TODO(content):` for the real logo until the client supplies one.

### Images: real OAUSTECH images, self-hosted
- Use real images from the OAUSTECH website, downloaded into `public/images/` and served with `next/image`. Never hotlink.
  - Logo: https://oaustech.edu.ng/images/logo.png to `public/images/oaustech-logo.png`
  - Campus photo: https://oaustech.edu.ng/cache/resized/0930ca64ead13e2113232a6df145a9c7.jpg to `public/images/oaustech-campus.jpg` (used in the hero)
- If a download fails, use a neutral placeholder captioned "Campus photo" and report it. Never substitute stock photos or AI images.
- Write proper, descriptive alt text. No em dashes in alt text.
- The About and Why OAUSTECH sections have image slots that work with or without a photo. More client photos may be added later; register them in one place (`src/content/images.ts`) rather than hard-coding paths in components.

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
