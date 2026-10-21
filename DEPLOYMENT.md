# GreenKarachi — Deployment Guide

> **Status: live deployment is PENDING the project owner's go-ahead.**
> The Supabase project used by GreenKarachi is currently **INACTIVE (paused)**
> and none of the Phase 3–8 migrations have been applied to it. Nothing in
> this document has been executed against a live service. The steps below are
> the checked, repeatable procedure to follow once the owner approves
> restoring the project. Do not claim production readiness until every item
> in the [release checklist](#release-checklist) is done.

## Architecture at a glance

| Piece | Technology | Notes |
| --- | --- | --- |
| Client | React + TypeScript + Vite, React Router, Tailwind | Static build output in `dist/client/` at the repo root |
| Server | Node.js + TypeScript + Express | Compiled `.js` companions live next to sources in `server/src/` (the repo pattern); start with `npm start` in `server/` |
| Database/Auth | Supabase (PostgreSQL + Auth) | The API talks to Postgres through the Supabase JS client with the service-role key, after its own auth/role/participant checks. Prisma schema exists for the Phase 2 models; runtime data access is via Supabase |
| Payments | **None** | GreenKarachi never processes payments. Pledges are support interest only; `funds_received` is always 0 |

## Environment variables

Names only — never commit real values. Copy the examples and fill in values
locally or in your hosting provider's secret store:

- Root combined example: `.env.example`
- Server example: `server/.env.example`
- Client example: `client/.env.example`

### Server (`server/.env` or repo-root `.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` / `SERVER_PORT` | No (default 4001) | Port the API listens on |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `JWT_SECRET` | Yes | Secret for app-issued session tokens. Use a long random value |
| `SUPABASE_JWT_SECRET` | Yes | Verifies Supabase-issued tokens |
| `CORS_ORIGIN` | Yes | Comma-separated exact frontend origins allowed to call the API |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server only.** Bypasses RLS; the API enforces auth, roles, and participant checks before using it. Never expose it to the client |
| `DATABASE_URL` | For Prisma tooling | PostgreSQL connection string from the Supabase project's database settings |

### Client (`client/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Base URL of the API server. Only `VITE_`-prefixed variables reach the browser bundle — never put server secrets here |

## Database setup (Supabase)

### Prerequisites

1. The project owner restores/unpauses the Supabase project (dashboard →
   project → Restore). **This step needs the owner's go-ahead and has not
   been done.**
2. The Phase 2 foundation must exist: Supabase Auth enabled and a
   `public.nurseries` table with a unique UUID `user_id` column (created
   during Phase 2 project setup; the Phase 3 migration only adds the unique
   index on it).

### Apply the migrations, in this exact order

Apply each file in `server/supabase/migrations/` exactly once, in order,
either by pasting it into the Supabase **SQL Editor** and running it, or with
`psql "$DATABASE_URL" -f <file>`:

| # | File | Creates / changes |
| --- | --- | --- |
| 1 | `20261009_phase3_plant_listings.sql` | `plant_listings` (+ unique index on `nurseries.user_id`) |
| 2 | `20261020_phase4_quotations_orders.sql` | `quote_requests`, `quotations`, `orders`, `order_items` |
| 3 | `20261020_phase5_supply_gap_collaboration.sql` | `supply_gap_requests`, `supply_offers`, `supply_offer_events` |
| 4 | `20261020_phase6_plantation_projects_pledges.sql` | `plantation_projects`, `project_requirements`, `project_progress_updates`, `project_pledges`, `project_pledge_events` |
| 5 | `20261020_phase7_admin_operations.sql` | `user_account_states`, `content_reports`, `admin_audit_log`; adds `moderation_status` to listings and projects and tightens their RLS policies |
| 6 | `20261021_phase8_conversations_notifications.sql` | `conversations`, `conversation_messages`, `notifications` |

All migrations are written additively (`create table if not exists`,
`add column if not exists`), so re-running one is safe, but skipping one is
not: later phases depend on earlier tables, and since Phase 7 the public
catalog/project queries filter on `moderation_status`, so the app cannot run
against a database that is missing any of the six.

### Verify the database

- In the Supabase Table Editor, confirm all tables above exist.
- Confirm RLS is enabled on the Phase 7/8 tables (`user_account_states`,
  `content_reports`, `admin_audit_log`, `conversations`,
  `conversation_messages`, `notifications`) with no permissive public
  policies: they are reachable only through the API server.
- Start the API and check the health endpoint (below).

## Deploy the server

```bash
cd server
npm install
npx prisma generate   # generates the Prisma client; requires network access to the Prisma CDN
npm run build         # type-checks and emits compiled companions next to sources
# set the server environment variables (see table above), then:
npm start             # node src/index.js
```

Verify: `GET /api/health` returns `{"status":"ok", ...}`.

> Environment note: in the sandboxed VM used for Phase 9 verification,
> `npx prisma generate` cannot download Prisma engine binaries (network
> reset), so `npm run build` / full server typecheck stop at one known error
> in `src/lib/prisma.ts` (`PrismaClient` not generated). This reproduces on
> unmodified `main` and is an environment limitation, not a code defect; on
> a normal host `npx prisma generate` succeeds and the build is expected to
> complete. The pre-built compiled companions committed in `server/src/` let
> `npm start` run without a local build.

## Deploy the client

```bash
cd client
npm install
# set VITE_API_URL in client/.env to the deployed API base URL
npm run build         # outputs static files to dist/client/ at the repo root
```

Serve `dist/client/` from any static host. Because the client uses React
Router, the host must rewrite unknown paths to `index.html` (SPA fallback);
on Netlify that is a `_redirects` file with `/*  /index.html  200` or the
equivalent `netlify.toml` rule. Set the production API origin in the
server's `CORS_ORIGIN`, or browser calls will be blocked.

## Health check

- Endpoint: `GET /api/health` → `200 {"status":"ok","timestamp":...,"message":"GreenKarachi API is healthy"}`
- Point your host's/uptime monitor's health check at this path. It proves
  the API process is up; it does not query the database, so also verify one
  authenticated workflow after each deploy (see the demo walkthrough).

## Demo walkthrough (seed/demo data)

There is no automated seed script: nurseries and listings are keyed to
Supabase Auth users, so demo data is created through the app itself.
**Demo accounts are for the demo environment only — never reuse these
passwords anywhere else.**

1. Register four accounts (Register page): a buyer
   (`buyer@demo.greenkarachi.local`), and three nursery owners —
   Nursery A (`a@demo.greenkarachi.local`), Nursery B
   (`b@demo.greenkarachi.local`), Nursery C (`c@demo.greenkarachi.local`) —
   each with the demo-only password `DemoPass123!`. Each nursery owner saves
   their nursery profile (Profile/Inventory flow).
2. As Nursery A, create a Neem listing with **60** available plants.
3. As the buyer, request a quote for **100** Neem trees from Nursery A's
   listing (Quotes & Orders). Nursery A responds with a quotation; the
   buyer accepts it and an order is created with the agreed terms snapshot.
   Accepting reserves the 60 available plants.
4. As Nursery A, publish a supply-gap request: total required **100**,
   current stock **60**. The server derives the gap: **40 needed**.
5. As Nursery B, offer **25** Neem trees; as Nursery C, offer **15**.
   While the offers are Pending, committed supply stays 0.
6. As Nursery A, accept both offers. Committed supply totals exactly
   **40** and the remaining gap is **0**. Accepting a further offer is
   rejected — commitments can never exceed the gap, even concurrently.
7. Check the Collaboration page as each participant: everyone sees their
   own part of the breakdown (needed / offered / committed / remaining),
   plus notifications and a conversation thread on the request.
8. Throughout, the UI states that an accepted offer is **supply committed,
   not proof of delivery**, and that **no payment has been processed** —
   delivery and any payment are arranged directly between the nurseries.

Also spot-check: an organizer publishes a project and a donor records a
pledge (summary shows intended support and funds received = PKR 0), and an
admin can see the audit trail entries the above actions produced.

## Backup and recovery

- The database is Supabase Postgres: rely on the project's automatic
  backups / point-in-time recovery according to its plan, and take a manual
  `pg_dump "$DATABASE_URL"` export before applying new migrations.
- Application rollback is code-only: redeploy the previous phase's commit
  (each phase lives on its own branch, e.g. `phase-8-conversations-notifications`).
- Database rollback: the migrations are additive, so older code generally
  keeps working against a newer schema (Phase 7's `moderation_status`
  columns default to `VISIBLE`). If a migration must be undone, drop that
  phase's tables in reverse application order (8 → 3) after taking a
  backup; this destroys that phase's data and must be an owner-approved,
  deliberate action.

## Release checklist

### Verified locally (Phase 9 audit, 2026-10-21)

- [x] Server tests: **145/145 pass** (auth, catalog, quotes/orders,
      collaboration, projects/pledges, admin, conversations, notifications)
- [x] Client typecheck clean; client production build succeeds
- [x] Server typecheck: the only error is the pre-existing Prisma
      generation issue described above (environment-blocked, also on `main`)
- [x] Security review: no committed secrets; `.gitignore` covers `.env*`,
      `node_modules/`, and build output; no server secret is referenced from
      client code; every protected route group sits behind `requireAuth`
      plus role/participant checks; money is stored as `numeric(12,2)` /
      `numeric(14,2)` and validated to at most two decimals; no payment
      behavior exists anywhere
- [x] Fixed in Phase 9: missing `.gitignore`, missing `client/.env.example`,
      missing `DATABASE_URL` in the env examples, and a broken server
      `npm start` script (pointed at a nonexistent `dist/index.js`)

### Still required before calling this production-ready (needs live services / owner go-ahead)

- [ ] Owner approves restoring the paused Supabase project
- [ ] Apply the six migrations in order (above) and verify tables/RLS
- [ ] Run `npx prisma generate` + server build on a host with normal
      network access; confirm the full server typecheck is clean
- [ ] Run `npm audit` for client and server in an unrestricted environment
      (the Phase 9 sandbox's registry policy blocks the audit endpoint)
- [ ] Execute the full demo walkthrough live, end to end, plus one admin
      verification/moderation pass and one suspended-account login attempt
- [ ] Set production secrets (`JWT_SECRET`, `SUPABASE_JWT_SECRET`,
      service-role key) in the host's secret store; set `CORS_ORIGIN` to
      the real frontend origin(s) only
- [ ] Configure the client host with the SPA fallback rewrite
- [ ] Pre-production hardening to schedule: add rate limiting to auth and
      other abuse-prone routes (none is configured today), and consider
      moving the saga-style multi-table writes (quote acceptance, offer
      acceptance, admin mutations + audit) into Postgres RPC functions so
      each is a single transaction
- [ ] Known behavior to accept or fix deliberately: a suspended user's
      already-issued app token (24h) stays valid until expiry or next
      login; the conversation list scans the 100 most recently updated
      threads; the navbar unread badge refreshes on session change, not
      live; optional-auth project detail reads recognize app-issued tokens
      only
