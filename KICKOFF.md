# First prompt for Claude Code

Put this folder's contents in your new project folder (so CLAUDE.md, docs/ and content/ are at the root), open Claude Code there, and paste:

---

Read CLAUDE.md, docs/features.md and content/landing-copy.md before doing anything.

We are in Phase 1: build the public landing page only.

1. Scaffold a Next.js (App Router) + TypeScript + Tailwind project with pnpm in this folder, keeping CLAUDE.md, docs/ and content/ where they are. Use the folder layout suggested in CLAUDE.md, with a (marketing) route group and an empty (platform) group reserved for later.
2. Set up the design tokens (colours, fonts, spacing) from CLAUDE.md as CSS variables wired into Tailwind. Load the fonts with next/font.
3. Move the landing copy into src/content/landing.ts as typed data, and put the phone number, form link and URLs in src/lib/site.ts.
4. Before writing section components, show me a short plan: the section order, the layout idea for each section, and the type and colour choices. Wait for my OK.
5. After I approve, build the sections one at a time. Start with the header, hero and programme structure timeline, then stop so I can review in the browser.

Rules that matter most: follow the copy exactly, no em dashes, no invented content, and none of the "do not use" design patterns in CLAUDE.md.
