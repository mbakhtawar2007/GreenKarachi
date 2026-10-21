# GreenKarachi

A responsive B2B marketplace that connects plant buyers, nursery owners, businesses, plantation organizers, donors, and investors in Karachi, Pakistan.

## Project Overview

GreenKarachi is more than an online plant catalog. Its core differentiator is **nursery-to-nursery collaboration**: if Nursery A needs 100 plants but has only 60, it can create a supply-gap request for the remaining 40. Other nurseries can offer available stock, and the requester can review offers and coordinate fulfillment.

## Quick Start (Windows PowerShell)

### Prerequisites

1. **Install Node.js**
   ```powershell
   # Download from https://nodejs.org/
   # Or using winget:
   winget install OpenJS.NodeJS
   ```

2. **Verify Installation**
   ```powershell
   node --version
   npm --version
   git --version
   ```

### Clone and Setup

```powershell
# Clone the repository (if available)
# git clone https://github.com/your-repo/greenkarachi.git
# cd greenkarachi

# If running from existing directory, ensure you have the project files:
# - AGENTS.md
# - GREENKARACHI_BUILD_PHASES.md
# - Other starter files

# Navigate to project directory
# Set-Location C:\path\to\GreenKarachi

# Install all dependencies
npm run install:all
```

### Run Development Server

```powershell
# Start both frontend and backend simultaneously
npm run dev

# This will run:
# - Frontend: React + Vite (usually on port 5173)
# - Backend: Node.js + Express (usually on port 3000)
```

### Check Build Status

```powershell
# Type check both frontend and backend
npm run check

# Build for production
npm run build
```

### Access the Application

- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:4001
- **Health Check**: http://localhost:4001/api/health

## Project Structure

```
greenkarachi/
├── client/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── index.html
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── api/
│   │   │   └── health.ts
│   │   ├── models/
│   │   ├── services/
│   │   └── types.ts
│   └── index.ts
├── .gitignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run install:all` | Install dependencies for both client and server |
| `npm run build` | Build both frontend and backend for production |
| `npm run check` | Run type checks on both frontend and backend |

## Phase-Based Development

This project is developed in phases using the OpenCode framework:

1. **Phase 0**: Bootstrap the project scaffold
2. **Phase 1**: Project foundation and visual shell
3. **Phase 2**: Database, authentication, user roles, and profiles
4. **Phase 3**: Nursery catalog and inventory management
5. **Phase 4**: Quotations and basic order lifecycle
6. **Phase 5**: Nursery-to-nursery supply-gap collaboration
7. **Phase 6**: Plantation projects and donor/investor interest
8. **Phase 7**: Admin operations, verification, moderation, and audit trail
9. **Phase 8**: Conversations, notifications, and workflow polish
10. **Phase 9**: Release readiness, security review, deployment, and documentation

To start a specific phase, run:
```powershell
opencode "Start Phase X from GREENKARACHI_BUILD_PHASES.md"
```

## Plant Catalog (Phase 3)

The catalog API uses the existing Supabase project for authenticated nursery profiles and listing storage. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment, then apply `server/supabase/migrations/20261009_phase3_plant_listings.sql` to that project's PostgreSQL database (for example, from the Supabase SQL Editor). The migration expects the existing `public.nurseries` table to have a unique UUID `user_id` column, as used by the nursery profile API.

The API is mounted at `/api/catalog/listings`. Public listing search accepts `query`, `species`, `category`, `location`, `minPrice`, `maxPrice`, `minQuantity`, `maxQuantity`, `verified`, `page`, and `pageSize`; the paginated nursery directory is available at `/nurseries`. Nursery owners manage listings at `/mine` and can create, edit, update stock, or archive their own records with a bearer access token. Only active listings appear in public search; out-of-stock and archived listings are not advertised as available.

To try owner inventory, register/sign in with the Nursery Owner role, open **Inventory**, save the nursery profile, and then add listings. Image URLs are optional and limited to HTTP/HTTPS; uploaded-file storage is not configured in this phase.

## Quotations and Orders (Phase 4)

Buyers request quotations for a listing (plant, quantity, delivery area/date, and notes), nurseries respond with a unit price, offered quantity, delivery charge/terms, and a validity deadline, and an order is created only when the buyer accepts a still-valid quotation. A quote request is not an accepted order, and no payment is processed or claimed by GreenKarachi. Accepted orders store immutable snapshots of the agreed price, quantity, buyer, supplier, delivery details, and terms; acceptance reserves stock with a conditional update, duplicate submissions are guarded by an idempotency key and open-request checks, and invalid status transitions are rejected on the server. Apply `server/supabase/migrations/20261020_phase4_quotations_orders.sql` after the Phase 3 migration. The API is mounted at `/api/quotes` (`/requests`, `/requests/mine`, `/requests/incoming`, `/requests/:id/quotation`, `/requests/:id/accept`, `/requests/:id/decline`, `/requests/:id/cancel`, `/requests/:id/decline-request`, `/orders/mine`, `/orders/incoming`, `/orders/:id/status`), and signed-in buyers and nursery owners use it from **Quotes & Orders** in the client. In-app notifications are not part of this phase because the current architecture has no notification system yet (planned for Phase 8).

## Nursery Collaboration (Phase 5)

Nursery owners publish supply-gap requests when they need more plants than they have: the request records the plant/species, total quantity required, current available stock, requirements, needed-by date, area, and notes, and the server derives `quantityNeeded = max(0, totalRequired - stockAvailable)`. Other nurseries (never the requester) submit offers with a quantity, unit price, availability/condition, delivery arrangement, and notes. Offers move through Pending, Accepted, Rejected, and Withdrawn states, and only accepted offers count as committed supply: the remaining gap is the needed quantity minus accepted commitments. Acceptance claims capacity with a compare-and-swap conditional update on the request's committed counter (backed by a database check constraint), so simultaneous acceptances cannot overcommit the gap, and every offer status change is recorded in an audit event table. An accepted offer is a supply commitment between the two nurseries, **not** proof of delivery, and no payment is processed or claimed by GreenKarachi. Apply `server/supabase/migrations/20261020_phase5_supply_gap_collaboration.sql` after the Phase 4 migration. The API is mounted at `/api/collaboration` (`/requests`, `/requests/mine`, `/requests/open`, `/requests/:id`, `/requests/:id/offers`, `/offers/mine`, `/offers/:id/accept`, `/offers/:id/reject`, `/offers/:id/withdraw`), and signed-in nursery owners use it from **Collaboration** in the client, which shows a needed / offered / committed / remaining breakdown for each request. In-app notifications are not part of this phase because the current architecture has no notification system yet (planned for Phase 8).

## Plantation Projects and Pledges (Phase 6)

Plantation organizers create projects (title, description, location, start/end timeline, tree target, plant-species/quantity requirements that must add up to no more than the tree target, an optional funding target, photo URLs, and contact preferences) as drafts, then publish, complete, or archive them. Organizers post progress updates with a cumulative reported trees-planted figure, and the project detail shows reported progress against the target. Signed-in users with a relevant role (donors/investors, buyers/businesses, nursery owners, organizers supporting other projects, admins) can record support interest or pledges against a published project: funds pledges carry an intended amount, tree/material pledges an intended quantity, and volunteer-time/other pledges a description. A supporter may hold only one live pledge of a given type per project; they can withdraw it, and the project's organizer can confirm the intention or decline it. **A pledge is an intention or commitment recorded for coordination, not a payment: GreenKarachi has no payment gateway, never marks pledged amounts as received, and every pledge summary shows intended support separately from funds received, which is always PKR 0 because no verified receipt process exists.** Apply `server/supabase/migrations/20261020_phase6_plantation_projects_pledges.sql` after the Phase 5 migration. The API is mounted at `/api/projects` (public discovery at `/` with `query`, `location`, `species`, `status`, `minTreeTarget`, `maxTreeTarget`, `page`, `pageSize` filters, public/participant detail at `/:id`, organizer routes at `/`, `/mine/list`, `/:id`, `/:id/status`, `/:id/progress`, and pledge routes at `/:id/pledges`, `/pledges/mine`, `/pledges/:id/withdraw`, `/pledges/:id/confirm`, `/pledges/:id/decline`). Pledges are private records: only the supporter and the project's organizer can read them, and platform-only contact details are never exposed to other viewers. Everyone uses it from **Projects** in the client, which combines discovery, project detail, an organizer dashboard, and a "My pledges" view. In-app notifications are not part of this phase because the current architecture has no notification system yet (planned for Phase 8).

## Technology Stack

### Frontend
- React + TypeScript + Vite
- React Router
- Tailwind CSS

### Backend
- Node.js + TypeScript + Express
- Supabase Auth + Postgres (Phase 2)
- Zod for validation

### Development
- Git for version control
- Concurrently for orchestrating frontend/backend
- TypeScript for type safety

## Environment Variables

Copy `.env.example` to `.env` and fill in your local development values:

```
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:5173
# ... other variables
```

## Important Notes

- This is a greenfield project being developed in phases
- PostgreSQL database setup is deferred until Phase 2
- No payment processing or integrated online services are included in the initial release
- Each phase must complete before starting the next one
- Business logic and API endpoints are implemented incrementally

## Support

For issues with project setup or running commands, refer to the START_HERE.md file or contact the development team.
# GreenKarachi
