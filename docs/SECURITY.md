# SECURITY.md: how every Galmee product protects its data

These systems hold businesses' money records and, for clinics, patient data. A leak between tenants or a forged payment would end Alpha's business. Security rules here override speed.

Sources: Next.js Data Security guide, Supabase production checklist and agent skills, OWASP Top 10. Load the `supabase` and `supabase-postgres-best-practices` skills (in `.claude/skills/`) before any database or auth work.

## 1. Database (Supabase / Postgres): the real security boundary

The browser is untrusted. Row Level Security is what actually protects data.

- RLS enabled on every table you create, in the same migration that creates it.
- Separate policies per operation: SELECT/DELETE use `USING`; INSERT uses `WITH CHECK`; UPDATE uses both. Never `FOR ALL`.
- Wrap helpers in a sub-select so they run once per query: `tenant_id = (select private.current_tenant())`, `(select private.current_app_role()) in ('owner','manager')`, `(select auth.uid())`.
- `TO authenticated` on every policy. `anon` gets nothing unless a public page truly needs it (e.g. a hotel booking-request insert), and then only INSERT on that one table with strict checks.
- Index every column a policy filters on (`tenant_id`, foreign keys).
- `SECURITY DEFINER` functions only in the `private` schema, always with `set search_path = ''` or `public, private`, `revoke all ... from public, anon`, then grant to the exact role. Prefer `SECURITY INVOKER`.
- Views: always `with (security_invoker = true)`.
- Money and stock change only through RPCs that validate inputs (`amount > 0`, item belongs to tenant) and write in one transaction. Add CHECK constraints and NOT NULL in the schema itself.
- Roles: owner, manager, staff. Staff never update or delete money records; corrections are new reversing entries, never edits.
- Clinic: clinical notes readable only by the doctor role; log every patient-record read.

**Mandatory RLS test for every migration.** Copy `supabase/tests/core_rls_test.sql`, extend it to your own tables, and run it with Supabase `execute_sql`. It creates two tenants plus a staff user, checks that tenant A cannot read, insert into or update tenant B, checks staff limits, checks anon sees nothing, then raises an exception so everything rolls back. Paste the result line into `DAILY_LOG.md`. A failing test blocks the commit.

After every migration run `get_advisors` for **security and performance**. Zero new warnings on your objects.

## 2. Next.js server: Data Access Layer

- All database access goes through `src/server/dal/*.ts`, each starting with `import 'server-only'`. Only the DAL reads `process.env` secrets.
- The DAL gets the user with `supabase.auth.getUser()` or `getClaims()`, which verify the token. Never trust `getSession()` on the server for authorization.
- The DAL returns small DTOs with only the fields the UI needs, never raw rows.
- Server Actions are public POST endpoints. Every action:
  1. validates input with **zod** (types, lengths, enums, positive amounts, UUIDs),
  2. re-checks the user and role inside the action (a page-level check does not protect the action),
  3. calls the DAL (which calls an RPC),
  4. returns only `{ ok, message }` or a minimal DTO.
- Route params and searchParams are user input: validate them.
- No side effects during render; mutations only in Server Actions or route handlers.
- `proxy.ts` (middleware) only refreshes the Supabase session cookie and redirects logged-out users. It is never the only authorization check.
- Enable `experimental.taint` and taint sensitive objects as an extra guard.

## 3. Secrets and keys

- Only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key go to the browser. The service-role key never appears in the Next.js app or repo.
- Chapa, AfroMessage and Telegram keys live only in Supabase Edge Function secrets. Ask Alpha in `NEEDS_APPROVAL.md`; never paste a key in code, logs, issues or commits.
- `.env*` is gitignored. Before every commit: `git diff --cached | grep -nE "service_role|sk_live|CHASECK|eyJhbGciOi"` must print nothing.

## 4. Edge Functions (SMS, Telegram, Chapa)

- Verify the caller's JWT unless the function is a webhook.
- Webhooks (Chapa) verify the signature against the raw body, check the amount and reference against our own pending record, and are idempotent (store the provider reference; ignore repeats). A payment is "paid" only after verification with Chapa's verify endpoint.
- CORS: only the app's own origin, never `*`.
- Rate-limit by tenant and phone using a database table (in-memory counters do not work across instances).
- Never log message bodies, phone numbers or keys.

## 5. HTTP headers (set in `next.config` headers and `proxy.ts`)

- Content-Security-Policy with a per-request nonce for scripts; `default-src 'self'`; `connect-src 'self'` plus the Supabase URL (https and wss); `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=()` (camera only for barcode scanning)
- Check with `curl -I` against the preview and record it in `DAILY_LOG.md` when headers change.

## 6. Auth settings (ask Alpha in NEEDS_APPROVAL.md; these need the dashboard)

- Turn on CAPTCHA (Cloudflare Turnstile) for sign-up, sign-in and password reset.
- Minimum password length 10, leaked-password protection on.
- Redirect URLs: exact production and preview domains only, no wildcards.
- Custom SMTP before real clients sign up (the default email limit is very low).
- Owners: offer MFA (TOTP); require it for owners once stable.

## 7. Client-side storage

- Supabase auth uses cookies via `@supabase/ssr`; never put tokens in localStorage.
- IndexedDB holds only this tenant's reference data and the outgoing queue; cleared on logout.

## 8. Dependencies and supply chain

- Commit `package-lock.json`. Add only widely used, maintained packages.
- `npm audit --omit=dev` each run; fix high and critical issues the same day.
- `.github/dependabot.yml` keeps npm and GitHub Actions updated weekly.

## 9. Before marking any milestone done: self-audit

Walk the Next.js audit list and write the answers in `DAILY_LOG.md`:

- Is every database call inside the `server-only` DAL?
- Do any `"use client"` components receive more data than they render?
- Does every Server Action validate input, re-check auth and role, check that the record belongs to the tenant, and return minimal data?
- Are all `[param]` routes validated?
- Did the cross-tenant RLS test pass for every table touched?
- Do the advisors show zero security warnings for your objects?
