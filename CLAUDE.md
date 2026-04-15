
# CLAUDE.md

Mobile-first PWA to manage a small vape/puff shop. 2 users: owner + worker. Offline-capable. Free-tier stack.

## Stack
- Next.js 14 (App Router, TS) + Tailwind + shadcn/ui
- `next-pwa` for PWA/offline
- Supabase: Postgres, Auth, RLS, Realtime, Storage
- Deploy: Vercel
- State: React Server Components + `@tanstack/react-query` for client mutations
- Forms: `react-hook-form` + `zod`

## Commands
```
pnpm dev      # local
pnpm build    # prod build
pnpm lint
pnpm typecheck
supabase db push   # apply migrations
```

## Env
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).

## Data model

```
users(id, name, pin_hash, role['owner'|'worker'], active, created_at)
categories(id, name)
products(id, name, category_id, cost_price, sell_price, stock, low_stock_threshold, photo_url, barcode, archived, created_at)
shifts(id, user_id, opened_at, closed_at, opening_cash, closing_cash, expected_cash, note)
sales(id, shift_id, user_id, created_at, total, payment_method['cash'|'other'])
sale_items(id, sale_id, product_id, qty, unit_price, unit_cost)   -- snapshot prices
restocks(id, product_id, qty, unit_cost, supplier, created_at, user_id)
audit_log(id, user_id, action, entity, entity_id, payload_json, created_at)
```

Rules:
- `sale_items` snapshots `unit_price`/`unit_cost` at sale time. Never recompute profit from current product prices.
- `products.stock` updated via DB triggers on `sale_items` insert and `restocks` insert. Atomic.
- Sales are immutable. Corrections = new sale with negative qty, linked via `audit_log`.
- One open shift per user at a time (partial unique index `where closed_at is null`).

## Auth
- PIN-based. Custom `users` table, not Supabase Auth emails.
- Login = name + 4-6 digit PIN. Server hashes with bcrypt, issues signed JWT cookie (httpOnly, 12h).
- Session middleware in `middleware.ts` reads cookie, sets `x-user-id` / `x-user-role` headers for RSC.

## RLS (enforce at DB, not just UI)
- `products.cost_price`: SELECT denied for role=worker. Use a view `products_public` without cost_price for worker client.
- `restocks`: all ops owner-only.
- `sales`, `sale_items`: worker can INSERT + SELECT own shift's rows. Owner full read.
- `shifts`: worker can INSERT/UPDATE own open shift. Owner full read.
- `users`, `audit_log`: owner only.

## Permissions matrix
| Action              | Owner | Worker |
|---------------------|-------|--------|
| Log sale            | ✓     | ✓      |
| View own shift      | ✓     | ✓      |
| Start/end shift     | ✓     | ✓      |
| View stock levels   | ✓     | ✓      |
| View cost/profit    | ✓     | ✗      |
| Restock             | ✓     | ✗      |
| Edit products       | ✓     | ✗      |
| View all shifts     | ✓     | ✗      |
| Manage users        | ✓     | ✗      |

## Features (MVP only — do not add more)

### Worker flow
1. PIN login
2. If no open shift → Start Shift (enter opening cash)
3. Products grid (photo + name + sell price). Tap → qty → confirm. 2–3 taps/sale.
4. Current shift summary (sales count, cash total)
5. End Shift → enter closing cash → show expected vs actual → logout

### Owner flow
- Everything worker has, plus:
- Dashboard: today/week/month revenue, profit, top sellers, low-stock list
- Products CRUD (photo upload to Supabase Storage)
- Restock entry
- Shifts history with discrepancy column
- Users: add/disable worker

## Offline
- Service worker caches shell + product list.
- Sales queued in IndexedDB (`idb` lib) when offline, synced on reconnect.
- Each queued sale has client-generated UUID to dedupe on server.
- Show offline banner + pending-sync count.

## UX rules
- Mobile-first. Touch targets ≥ 44px.
- Main sale screen: no scrolling needed for top 12 products. Search for rest.
- No modals for critical flows — use full screens.
- All money displayed with currency symbol from a single `formatMoney()` util.
- Confirmations only for destructive actions (end shift, delete product).
- Loading states: skeleton, not spinners, on list screens.

## Code conventions
- `/app` routes grouped: `(auth)`, `(worker)`, `(owner)`.
- Server Actions for all mutations. No API routes unless needed for webhooks.
- Zod schemas in `/lib/schemas`, shared client+server.
- DB access only in `/lib/db/*` modules. Components never import supabase client directly for mutations.
- Naming: `kebab-case` files, `PascalCase` components, `camelCase` functions.
- No default exports except Next.js pages/layouts.
- Strict TS. No `any`. No `@ts-ignore` without comment.

## Don'ts
- No customer/loyalty/CRM features.
- No multi-store, multi-currency, i18n (yet).
- No Stripe/payments — cash shop.
- No email/SMS.
- No charts library until dashboard actually needs one (use CSS bars first).
- No Redux/Zustand — RSC + react-query is enough.
- Don't edit `sales` or `sale_items` after insert. Ever.
- Don't expose `cost_price` to worker client, even in dev.

## When unsure
Prefer: fewer dependencies, fewer files, server components, DB-level constraints over app-level checks, immutable records over mutable, explicit over clever.
