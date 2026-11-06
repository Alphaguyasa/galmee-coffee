# Galmee core schema (shared, read-only for this repo)

All 10 Galmee products share ONE Supabase project: `galmee` (ref `ultztraqdcnpkqqzleeb`, region eu-central-1).

The core schema was applied on 2026-11-06 as three migrations:

1. `core_schema_v1`
2. `core_security_hardening`
3. `core_rls_perf_and_fk_indexes` (policies use `(select ...)`, all foreign keys indexed)

Cross-tenant RLS test: `supabase/tests/core_rls_test.sql` (passed on 2026-11-06).

Do not re-apply them. Inspect the live schema with the Supabase MCP `list_tables` tool or `generate_typescript_types`.

## Core objects you may use

| Object | Kind | Notes |
| --- | --- | --- |
| `tenants` | table | One row per business. `vertical` enum: clinic, pharmacy, school, hotel, garage, wholesale, transport, coffee, driving, rentals |
| `profiles` | table | user_id -> tenant_id, role (`owner`, `manager`, `staff`) |
| `branches`, `customers`, `items`, `stock_batches`, `stock_movements` | tables | `tenant_id` defaults to `private.current_tenant()` |
| `sales`, `sale_lines`, `payments`, `credit_ledger` | tables | Write money only through the RPCs below |
| `bookings` | table | Exclusion constraint prevents overlapping bookings per `resource_id` |
| `notifications` | table | Queue for SMS / Telegram, sent by Edge Functions |
| `audit_log` | table | Filled automatically by triggers |
| `subscriptions` | table | Alpha's billing per tenant |
| `customer_balances` | view | Balance per customer (security_invoker) |
| `item_stock` | view | Qty on hand + next expiry per item (security_invoker) |
| `create_tenant(name, vertical, full_name, phone, lang)` | RPC | Called once after signup; makes the caller the owner |
| `record_sale(lines jsonb, customer, paid, method, client_ref, due)` | RPC | FEFO stock deduction, payment, credit debt; idempotent on `client_ref` for offline sync |
| `record_repayment(customer, amount, method, reference)` | RPC | Payment + credit ledger repayment |
| `receive_stock(item, qty, cost, batch, expiry)` | RPC | New batch + movement |
| `adjust_stock(batch, new_qty, reason)` | RPC | Owner/manager only |
| `private.current_tenant()`, `private.current_app_role()` | helpers | Use in RLS policies of your own tables |

## Rules

- Never ALTER or DROP core objects. If the core needs a change, write it in `NEEDS_APPROVAL.md`.
- Your own tables must be prefixed with this product's prefix (see CLAUDE.md), carry `tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade`, and have RLS policies written as `tenant_id = (select private.current_tenant())` (the sub-select makes Postgres evaluate it once per query). Follow `docs/SECURITY.md`.
- After every migration, run Supabase `get_advisors` (security) and fix new warnings for your own objects.
