# ROADMAP: Galmee Coffee

## M0: Foundation (shared pattern for all Galmee products)

- [ ] Next.js App Router + TS + Tailwind + shadcn/ui scaffold; `npm run build` passes
- [ ] PWA manifest, icons, offline shell; installs from Android Chrome
- [ ] Supabase client (`@supabase/ssr`) with `.env.example` values; middleware session refresh
- [ ] Auth: sign up, log in, log out; after first signup call `create_tenant` (vertical `coffee`)
- [ ] next-intl with `am`, `om`, `en`; language switcher; Ethiopic-friendly font (Noto Sans Ethiopic)
- [ ] Ethiopian calendar date display helper + tests
- [ ] App shell: bottom navigation on mobile, sidebar on desktop, tenant name and logo
- [ ] Staff management (owner only): invite staff, set role
- [ ] Generated Supabase TypeScript types committed

## M1: Core screens

- [ ] Customers: list, search by name/phone, detail with balance
- [ ] Items and stock (if this product uses stock): list, add, receive stock
- [ ] Payments and credit: record payment, credit statement
- [ ] Reports: today / this week / this Ethiopian month; export CSV
- [ ] Offline queue for the main money action with sync status indicator

## M2: Galmee Coffee features

- [ ] Farmer register
- [ ] Purchase entry (farmer, kg, grade, price/kg, moisture note)
- [ ] Advances to farmers
- [ ] Farmer statement
- [ ] Daily purchases by grade
- [ ] Warehouse stock by grade
- [ ] Migration: cf_farmers
- [ ] Migration: cf_grades
- [ ] Migration: cf_purchases
- [ ] Migration: cf_advances
- [ ] Migration: cf_lots
- [ ] Payment due = kg x price - advances
- [ ] Lot totals by grade

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
- [ ] Export all tenant data to Excel
- [ ] Error monitoring hook (Sentry, DSN via env)
- [ ] README: setup, env vars, deploy steps

## Q: Quality and security baseline (do these inside M0 and M1, not after)

- [ ] `docs/DESIGN.md` written per the frontend guidelines (palette, type with Ethiopic support, layout wireframes, reviewed against generic defaults)
- [ ] Tailwind theme tokens and `next/font` fonts from DESIGN.md
- [ ] `server-only` Data Access Layer in `src/server/dal/`; every Server Action validates with zod and re-checks auth + role
- [ ] Security headers and CSP with nonce (the security guidelines section 5)
- [ ] Cross-tenant RLS test extended to this product's tables and passing
- [ ] Playwright screenshot script for 360 px and 1280 px
- [ ] `npm audit` clean, Dependabot active
- [ ] Self-audit (the security guidelines section 9) recorded in the dev log
