# FRONTEND.md: how every Galmee screen is designed and built

These rules come from Anthropic's frontend-design guidance for Claude Code, Vercel's React/Next.js best practices and Web Interface Guidelines, and the realities of our users. Follow them on every UI task.

## Who uses this

Shop owners, cashiers, receptionists and clerks in Shashamane and nearby towns.

- Cheap Android phones (2 to 3 GB RAM), 360 px wide screens, often in bright daylight
- Slow or dropping mobile data; the app must stay usable offline
- Amharic (Ge'ez script), Afaan Oromo (Latin script, Qubee) and English
- Often busy, standing at a counter, using one thumb. Speed and clarity beat decoration.

## Skills to load (they are in `.claude/skills/`)

| When | Skill |
| --- | --- |
| Before designing or restyling any screen | `frontend-design` (Anthropic) |
| Writing or reviewing React / Next.js code | `vercel-react-best-practices` |
| Building reusable components | `vercel-composition-patterns` |
| Before closing any UI task: review changed files | `web-design-guidelines` |
| Taking screenshots to check your work | `webapp-testing` (Playwright) |

## Step 1: design system first (`docs/DESIGN.md`)

Before the first real screen, write `docs/DESIGN.md` following the `frontend-design` skill:

- **Ground it in this business.** Draw colour and character from the trade itself (a pharmacy's clean shelves and labels, a coffee trader's sacks and scales, a school's exercise books), not from generic SaaS. Each Galmee product should look like itself.
- **Colour:** 4 to 6 named hex values as CSS variables in Tailwind's theme. One dominant colour with a sharp accent. Status colours (paid, owed, expiring, overdue) must be distinguishable without colour alone (icon or text too).
- **Type:** choose deliberately and self-host with `next/font`. It must render Ethiopic well: pair a distinctive Latin face with an Ethiopic face (for example Noto Sans Ethiopic or Noto Serif Ethiopic) and test real Amharic text. Do not default to Inter, Roboto or Space Grotesk. Set a clear type scale; money uses tabular figures (`font-variant-numeric: tabular-nums`).
- **Layout:** sketch the main screens as ASCII wireframes for 360 px first, then desktop.
- **Review the plan** against the generic defaults listed in the skill (cream + terracotta, black + acid green, identical rounded cards with soft shadows, ALL-CAPS eyebrow labels, gradient washes) and change anything that looks like a default.
- Spend boldness in one place; keep the rest quiet.

## Step 2: build rules

**Mobile and touch**
- Design at 360 x 800 first. Tap targets at least 48 x 48 px. The primary action sits within thumb reach (bottom bar or sticky footer).
- One primary action per screen. Name buttons by what happens: "Record sale", not "Submit". Keep the same verb through the flow ("Record sale" leads to "Sale recorded").
- Numeric inputs use `inputmode="decimal"`, phones use `type="tel"`. Never make a cashier open the full keyboard to type a price.
- Search-first lists: customers and items findable in two taps by name, phone or code.

**Money, dates, language**
- Format birr with `Intl.NumberFormat` (e.g. "ብር 1,250.00" / "1,250.00 ETB"); never floats in JS for money math (the database does money math).
- Show Ethiopian calendar dates by default, Gregorian on tap or in settings.
- Every visible string goes through next-intl (`am`, `om`, `en`). Set `<html lang>` per locale. Never concatenate translated fragments; use ICU messages with variables.
- Plain, short words. Errors say what happened and how to fix it. Empty screens invite the next action ("No customers yet. Add your first customer.").

**States: every screen has all of these**
- Loading (skeleton that matches the layout, not a spinner over a blank page)
- Empty, error (with a retry), offline (banner plus "will sync" badge on queued items), success (confirm what changed)

**Accessibility (quality floor, not optional)**
- WCAG 2.2 AA contrast at minimum; key numbers (totals, balances) aim for AAA because of sunlight.
- Visible keyboard focus, real `<label>`s, `aria-live` for toasts, no information by colour alone.
- Respect `prefers-reduced-motion`. Motion only where it answers a user action (confirming a sale, opening a sheet); at most one orchestrated moment on first load.

**Performance (Vercel rules)**
- Server Components by default; `"use client"` only for interactive leaves. Keep client bundles small.
- No request waterfalls: fetch in parallel, stream with Suspense.
- Budget: first load JS under 150 KB gzip on the main screens; LCP under 2.5 s on a mid-range phone over 3G.
- `next/image` for images, `next/font` for fonts, no heavy chart or date libraries (write small helpers).

**Offline (PWA)**
- Service worker caches the app shell and static assets. Dexie stores only this tenant's reference data and the outgoing queue.
- Every queued money action carries a `client_ref` UUID so retries never double-record.
- Clear IndexedDB on logout.

## Step 3: check your work before committing

1. Run the `webapp-testing` skill: screenshots at 360 x 800 and 1280 x 800 of every screen you changed, in Amharic and English. Save to `docs/screenshots/`.
2. Look at them and critique: hierarchy clear in 2 seconds? Amharic text fits? Anything that looks generic? Remove one accessory.
3. Run the `web-design-guidelines` skill on the changed files and fix what it finds.
4. `npm run build` and `npm run lint` pass.
