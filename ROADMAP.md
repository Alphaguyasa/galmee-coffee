# ROADMAP: Galmee Coffee

## M-next: Tier 1 close-out

- [ ] SMS sender wiring for queued farmer receipts (shared Edge Function)
- [ ] Offline queue for `cf_record_purchase` (client_ref exists)
- [ ] Sync status indicator on buy screen

## M-after: Tier 2 and 3

- [ ] Collection-point field on purchases + per-point report
- [ ] Season settlement sheet per farmer (print)
- [ ] Owner evening Telegram summary
- [ ] Staff invite + per-clerk purchase report
- [ ] Lot dispatch: buyer, price realized, margin per lot
- [ ] Export-all to Excel

Out of scope: moisture-meter integrations and quality scoring beyond the free-text moisture note; a second calendar screen (the Ethiopian date is already shown everywhere).

## M0: Foundation (shared pattern for all Galmee products)

- [x] Next.js App Router + TS + Tailwind + shadcn/ui scaffold; `npm run build` passes
- [x] PWA manifest, icons, offline shell; installs from Android Chrome
- [x] Supabase client (`@supabase/ssr`) with `.env.example` values; middleware session refresh
- [x] Auth: sign up, log in, log out; after first signup call `create_tenant` (vertical `coffee`)
- [x] next-intl with `am`, `om`, `en`; language switcher; Ethiopic-friendly font (Noto Sans Ethiopic)
- [x] Ethiopian calendar date display helper + tests
- [x] App shell: bottom navigation on mobile, sidebar on desktop, tenant name and logo
- [ ] Staff management (owner only): invite staff, set role
- [ ] Generated Supabase TypeScript types committed

## M1: Core screens

- [ ] Customers: list, search by name/phone, detail with balance
- [ ] Items and stock (if this product uses stock): list, add, receive stock
- [ ] Payments and credit: record payment, credit statement
- [x] Reports: today / this week / this Ethiopian month; export CSV
- [ ] Offline queue for the main money action with sync status indicator (see M-next)

## M2: Galmee Coffee features

- [x] Farmer register
- [x] Purchase entry (farmer, kg, grade, price/kg, moisture note)
- [x] Advances to farmers
- [x] Farmer statement
- [x] Daily purchases by grade
- [x] Warehouse stock by grade
- [x] Migration: cf_farmers
- [x] Migration: cf_grades
- [x] Migration: cf_purchases
- [x] Migration: cf_advances
- [x] Migration: cf_lots
- [x] Payment due = kg x price - advances
- [x] Lot totals by grade

## M3: Notifications

- [ ] SMS receipt to the farmer after each purchase
- [ ] Edge Function reads `notifications` queue and sends (needs AfroMessage/Telegram keys: ask in the decision log)

## M4: Demo ready

- [ ] Demo tenant "Galmee Coffee Demo" with data: 50 fictional farmers across kebeles, 4 grades, a harvest month of purchases
- [ ] Demo login documented in the decision log for Alpha (password set by Alpha, never committed)
- [ ] 5-minute demo path works on a phone in airplane mode for the main action
- [ ] Amharic and Afaan Oromo text reviewed list in the decision log for Alpha (native speaker)

## M5: Client ready

- [ ] Receipt printing (58/80 mm thermal) and Telegram receipt
- [ ] Data import from Excel/CSV
- [ ] Export all tenant data to Excel (see M-after)
- [ ] Error monitoring hook (Sentry, DSN via env)
- [ ] README: setup, env vars, deploy steps

## Q: Quality and security baseline (do these inside M0 and M1, not after)

- [x] `docs/DESIGN.md` written per the frontend guidelines (palette, type with Ethiopic support, layout wireframes, reviewed against generic defaults)
- [x] Tailwind theme tokens and `next/font` fonts from DESIGN.md
- [x] `server-only` Data Access Layer in `src/server/dal/`; every Server Action validates with zod and re-checks auth + role
- [x] Security headers and CSP with nonce (the security guidelines section 5)
- [x] Cross-tenant RLS test extended to this product's tables and passing
- [x] Playwright screenshot script for 360 px and 1280 px
- [x] `npm audit` clean, Dependabot active
- [ ] Self-audit (the security guidelines section 9) recorded in the dev log
