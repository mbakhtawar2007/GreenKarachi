# GreenKarachi — OpenCode Build Phases

This roadmap is designed for a **brand-new project with no existing application code**. Complete and verify each phase before asking OpenCode to start the next one. Keep `AGENTS.md` at the project root.

## Recommended workflow for a new project

1. Create a new, empty folder named `GreenKarachi`.
2. Extract the starter ZIP so `AGENTS.md`, `Agent.md`, `GREENKARACHI_BUILD_PHASES.md`, and `START_HERE.md` are directly inside that folder (not buried in another nested folder).
3. Open that folder in VS Code and open a terminal in it.
4. Run `opencode` and paste the Phase 0 prompt below. The starter pack contains instructions, not the application source code.
5. Give OpenCode **one phase prompt at a time**. Review the changed files and run the app after each phase before continuing.
6. Keep the root `AGENTS.md`; `Agent.md` is a duplicate included for convenience. OpenCode's documented project-instructions convention is `AGENTS.md`.

If you later move this plan into a folder that already contains code, tell OpenCode to inspect and preserve the existing stack instead of rebuilding it.

---

## Phase 0 — Bootstrap the new project

**Goal:** Create a clean, runnable application foundation from scratch. No pre-existing repository or source code is assumed.

**Prompt to paste into OpenCode:**

> Read `AGENTS.md`, `Agent.md`, and `GREENKARACHI_BUILD_PHASES.md` first. This is a greenfield project: I do not have an existing repository or application code. The Markdown starter files are the only expected existing project files. Do not waste this phase looking for existing features or ask me to provide a repo.
>
> Follow the recommended stack in `AGENTS.md`. Use npm unless the environment provides a clear reason not to. Create a simple, maintainable TypeScript project with a React + Vite frontend in `client/` and a Node.js + TypeScript + Express API in `server/`. Add root scripts to install/run/check the app conveniently, including a single `npm run dev` command that starts both frontend and API. Configure development CORS or a Vite proxy correctly, and add a basic API health endpoint such as `GET /api/health`.
>
> Add the minimal project configuration needed to run the scaffold: root and app `package.json` files, TypeScript configs, `.gitignore`, `.env.example` with placeholders only, and a useful `README.md` with Windows PowerShell setup/run instructions. Keep PostgreSQL/ORM integration for Phase 2; do not add real database-dependent features now. Do not build the marketplace UI, authentication, plant listings, orders, or collaboration logic in this phase. Do not add paid services or commit secrets. Check whether Git is already initialized; if not, initialize it without creating a commit. Install dependencies if network access allows. Run the available type-check/build/smoke checks and report accurately anything blocked by the environment. Finish with the exact command I should run to start GreenKarachi.

**Acceptance criteria:**

- The fresh project has a documented, maintainable structure and can be started from the project root.
- `npm run dev` starts the frontend and API together, or the precise environment blocker is documented.
- The frontend loads and the API health endpoint responds successfully.
- TypeScript configuration and build scripts work, or remaining errors are clearly reported.
- `.env.example` contains placeholders only; `.gitignore` excludes local secrets and generated dependencies/build output.
- No actual product feature beyond the scaffold/health endpoint is implemented.

## Phase 1 — Project foundation and visual shell

**Goal:** Create the smallest maintainable app foundation and a coherent responsive design, using mock data only where clearly labeled.

**Prompt to paste into OpenCode:**

> Implement Phase 1 only from `GREENKARACHI_BUILD_PHASES.md`. Follow `AGENTS.md`. Preserve the current stack if one exists. Establish or tidy the project structure, routes, shared layout, navigation, responsive design tokens, reusable UI primitives, accessible form controls, and page shells for Home, Marketplace, Nursery Directory, Collaboration, Projects, Login/Register, and role dashboards. Build a polished GreenKarachi visual identity with forest-green/neutral styling. Use clearly marked mock data only for visual development; do not imply mock items are real verified businesses. Include useful loading/empty/error states where appropriate. Do not build real authentication, database models, ordering, payments, or collaboration business logic yet. Update README with actual setup/run commands. Run available lint/type-check/tests/build and report results.

**Acceptance criteria:**

- App starts using documented commands.
- Navigation and routes work, including not-found behavior.
- Layout works at mobile and desktop widths.
- Shared components are reusable and code is not concentrated in one giant file.
- Mock data is clearly identified and no critical buttons pretend to complete server actions.

## Phase 2 — Database, authentication, user roles, and profiles

**Goal:** Introduce persistent data and secure account access.

**Prompt to paste into OpenCode:**

> Implement Phase 2 only. Inspect the existing architecture first. Add the persistent database, schema/models, migrations, seed script, environment-variable validation, registration/login/logout, secure password hashing, session or token handling appropriate to the stack, and server-side role/resource authorization. Support Buyer, Nursery Owner, Plantation Organizer, Donor/Investor, and Admin capabilities; allow multiple roles only if cleanly supported by the model. Add editable user and nursery profiles, and a basic admin verification status workflow. Do not collect CNIC or other sensitive documents unless the existing requirements clearly need it. Add tests for authentication, duplicate accounts, unauthorized access, and role checks. Update `.env.example`, README, migrations, and seed instructions. Do not yet implement the full inventory, order, or collaboration flows. Run the relevant checks.

**Acceptance criteria:**

- Accounts and nursery profiles persist across restarts.
- Passwords are never stored in plain text.
- Protected API routes reject anonymous users.
- Users cannot edit another user's private profile or another nursery's profile.
- Demo/seed credentials, if any, are documented and not production secrets.

## Phase 3 — Nursery catalog and inventory management

**Goal:** Allow nurseries to publish and maintain plant listings and buyers to find them.

**Prompt to paste into OpenCode:**

> Implement Phase 3 only. Build plant listing CRUD for authorized nursery owners and public marketplace/directory search. Include plant name, optional species, category, description, images or a safe image URL/storage abstraction, height/size when known, unit price in PKR, available whole-plant quantity, minimum order quantity, nursery location/service area, and active/out-of-stock/archive status. Add server-side validation, pagination, and filters for query, species/category, location, price, available quantity, and verification status where available. Prevent non-owners from editing listings. Do not trust frontend price or stock values. Avoid adding a paid image-storage dependency without configuration. Add tests and update documentation. Do not implement confirmed ordering or nursery collaboration yet.

**Acceptance criteria:**

- Nursery owners can create, edit, archive, and update their own stock.
- Public users can search/view active listings.
- Filters and pagination work on the backend.
- Negative stock, invalid prices, and unauthorized edits are rejected.

## Phase 4 — Quotations and basic order lifecycle

**Goal:** Let buyers request large plant quantities and nurseries respond with quotes and manage confirmed orders.

**Prompt to paste into OpenCode:**

> Implement Phase 4 only. Create quotation requests, supplier quotations, quote expiration/validity, and a basic order/order-item lifecycle. Buyers submit plant, quantity, delivery area/date, and notes. The nursery responds with unit price, available quantity, delivery charge/terms, and validity. Make it explicit that a quote request is not an accepted order. On buyer acceptance, create an order with immutable snapshots of agreed price, quantity, buyer, supplier, and terms. Use database transactions and safe stock checks; guard duplicate submissions and invalid status transitions. Include role-specific order screens and in-app notifications where the current architecture supports them. Do not implement payment processing. Add tests for unauthorized access, expired quotes, out-of-stock changes, duplicate requests, cancellations, and status transitions. Run checks and update docs.

**Acceptance criteria:**

- The buyer-to-nursery quote workflow works end to end.
- Confirmed orders preserve agreed commercial terms.
- Server validates quantity, price, stock, participants, and state transitions.
- No payment is charged or claimed to have been received.

## Phase 5 — Nursery-to-nursery supply-gap collaboration (core differentiator)

**Goal:** Allow a nursery that is short on stock to obtain offers from other nurseries and coordinate the remaining supply.

**Prompt to paste into OpenCode:**

> Implement Phase 5 only; this is GreenKarachi's highest-priority differentiator. Build supply-gap request CRUD and supplier offers. A request records requester nursery, plant/species, total quantity required, current available stock, quantity needed, requirements, needed-by date, area, notes, and status. Calculate `quantityNeeded = max(0, totalRequired - stockAvailable)` on the server. Eligible nurseries can submit offers with a positive integer quantity, unit price, availability/condition, delivery arrangement, and notes. Track Pending, Accepted, Rejected, and Withdrawn offer states. Only accepted offers count as committed supply. Calculate the remaining gap as requested gap minus accepted commitments, never counting pending/rejected/withdrawn offers. Use a database transaction/locking or a demonstrably safe concurrency strategy so simultaneous acceptances cannot overcommit the request. Reject offers against closed/fulfilled requests and prevent a supplier from offering invalid stock under the configured policy. Keep committed supply separate from delivery completion; an accepted offer is not proof of delivery. Show the requester a clear breakdown of needed, offered, accepted, and remaining quantity. Notify affected users for new, accepted, rejected, or withdrawn offers if notifications are available. Add thorough tests for zero gap, partial fulfillment, multiple suppliers, overcommit, concurrent acceptance, unauthorized offers, and closed requests. Update docs and run checks.

**Acceptance criteria:**

- The 100-required / 60-available example creates a 40-tree gap.
- Offers of 25 and 15 can cover that gap once accepted.
- Pending offers do not count as committed stock.
- Accepted commitments cannot exceed the requested gap, including concurrent requests.
- Requester and supplier can track their part without confusing supply commitment with delivery.

## Phase 6 — Plantation projects and donor/investor interest

**Goal:** Let organizers publish projects and collect non-payment pledges/support interest.

**Prompt to paste into OpenCode:**

> Implement Phase 6 only. Add plantation project create/edit/publish/archive workflows for authorized organizers. Include title, description, location, timeline, tree target, plant-species/quantity requirements, optional budget/funding target, photos, progress updates, and contact preferences. Let authenticated donors, investors, businesses, or users with relevant roles submit support-interest records or pledges. Track pledge type and status distinctly from funds received. A pledge is not a payment: do not add a payment gateway or mark amounts received. Add project discovery filters and project detail/dashboard views. Protect organizer-only edits and participant-only private records. Add tests for role permissions, valid project requirements, duplicate/withdrawn pledges as appropriate, and accurate pledge status. Update docs and run checks.

**Acceptance criteria:**

- Organizers can manage projects and their plant requirements.
- Users can register support interest/pledges.
- UI clearly distinguishes pledged/intended support from verified received funds.

## Phase 7 — Admin operations, verification, moderation, and audit trail

**Goal:** Establish minimum trust and platform governance controls.

**Prompt to paste into OpenCode:**

> Implement Phase 7 only. Complete admin views and APIs for user/nursery verification, listing/project moderation, reported content, account suspension, and an audit history for sensitive administrative and business status changes. Only admins may perform these actions; enforce this on the server. Never make a user verified simply because they uploaded a file or filled a form. If document upload exists, keep files private and access-controlled. Add useful filters, pagination, confirmation for destructive actions, and tests proving ordinary users cannot access admin routes. Do not introduce unnecessary sensitive-data collection. Update documentation and run checks.

**Acceptance criteria:**

- Admin actions are authorized, recorded, and traceable.
- Verification state is visible and accurate.
- Verification files and private records are not publicly accessible.

## Phase 8 — Conversations, notifications, and workflow polish

**Goal:** Make coordination easier and harden the end-to-end user experience.

**Prompt to paste into OpenCode:**

> Implement Phase 8 only. Add or complete conversation/message threads for authorized participants in quote, order, supply-gap, and project-support workflows. Implement reliable in-app notifications for relevant events, read/unread state, and links to the affected record. Respect privacy: only conversation participants and authorized admins can read messages. Polish mobile screens, accessibility, loading/empty/error/success states, form feedback, and status labels. Do not add external email/SMS/WhatsApp providers unless configured and explicitly needed. Add tests for message access control and notifications. Run checks and update docs.

**Acceptance criteria:**

- Users can coordinate within permitted workflows.
- Notifications link to the correct record and cannot leak private data.
- Mobile and error states are usable and accessible.

## Phase 9 — Release readiness, security review, deployment, and documentation

**Goal:** Verify the end-to-end app and prepare repeatable deployment.

**Prompt to paste into OpenCode:**

> Implement Phase 9 only. Audit the completed GreenKarachi app against `AGENTS.md` and all previous phase acceptance criteria. Do not add new major features. Run unit/integration tests, type-check, lint, production build, and available security/dependency checks. Fix verified defects, add missing regression tests, and review authorization boundaries, session handling, validation, upload security, CORS/CSRF needs for the chosen auth model, rate limiting, secret leakage, database transactions, concurrent stock/offer handling, pagination, and error handling. Add deployment documentation, `.env.example`, migration/seed instructions, health-check instructions, backup/recovery notes where applicable, and a clear demo walkthrough using seeded data. Document anything that remains unverified because external services or credentials are unavailable. Never claim production readiness if critical checks remain unresolved.

**Acceptance criteria:**

- Clean setup/deploy procedure is documented and actually checked where possible.
- Build and test results are reported accurately.
- Critical auth, authorization, inventory, collaboration, and privacy cases are tested.
- Known limitations and required environment secrets/services are documented without exposing real secrets.

---

## End-to-end demo scenario to keep working

Use seed/demo data to verify this complete flow:

1. Nursery A has 60 Neem trees available.
2. A buyer needs 100 Neem trees and requests a quote.
3. Nursery A identifies the 40-tree shortage and publishes a supply-gap request.
4. Nursery B offers 25 Neem trees; Nursery C offers 15.
5. The requester reviews and accepts the offers.
6. The committed supply totals exactly 40, and the request shows zero remaining gap.
7. All participating nurseries and the requester can see their allowed status updates.
8. The system still distinguishes supply commitment from actual delivery and does not imply that payment has been processed.

## How to request each next phase

After inspecting and approving a phase report, send a simple message such as:

> Start Phase 3 from `GREENKARACHI_BUILD_PHASES.md`. Read `AGENTS.md`, inspect the current implementation, implement only Phase 3, run the relevant checks, and report files changed, test results, and any limitations.
