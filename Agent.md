# GreenKarachi — OpenCode Project Instructions

## 1. Product mission

Build **GreenKarachi**, a responsive B2B marketplace that connects plant buyers, nursery owners, businesses, plantation organizers, donors, and investors in Karachi, Pakistan.

GreenKarachi is more than an online plant catalog. Its core differentiator is **nursery-to-nursery collaboration**: if Nursery A needs 100 plants but has only 60, it can create a supply-gap request for the remaining 40. Other nurseries can offer available stock, and the requester can review offers and coordinate fulfillment.

## 2. Non-negotiable workflow rules

1. **Work one phase at a time.** Follow `GREENKARACHI_BUILD_PHASES.md` in order. Do not silently implement later phases while working on the current phase.
2. This is a **greenfield project**: assume there is no existing application/repository until files prove otherwise. The starter Markdown files are project instructions, not source code. Start with Phase 0 to bootstrap the application; do not ask the user for an existing repository.
3. If real application code or a working stack is discovered, preserve it unless there is a strong technical reason to change it. Do not replace dependencies or rewrite the application just for preference.
4. Before significant edits, summarize the files you expect to create/change and a small implementation plan. Then implement the requested phase rather than stopping at the plan.
5. Make small, coherent, testable changes. Do not generate the entire application in one response or one giant file.
6. Never leave fake buttons, dead links, empty event handlers, or UI controls that imply working functionality but do nothing. If something is intentionally a placeholder, label it clearly.
7. Never claim tests, builds, migrations, or deployments passed unless you actually ran them and inspected the result.
8. After each phase, run the relevant tests, type checks, lint, and build scripts available in the repository. Fix regressions caused by your changes before declaring the phase complete.
9. Finish each phase with a report: implemented features, important files changed, commands run and results, known limitations, and the next phase recommended. Wait for a direct user instruction before beginning the next phase.
10. Do not ask the user to repeat information already in this file or the build phases document. Make reasonable, safe assumptions and record them.

## 3. Product roles

Support role-based permissions; a single user may eventually have more than one role.

- **Buyer / Business:** browse plants and nurseries, request quotations, confirm orders, and follow order progress.
- **Nursery Owner:** manage nursery profile and inventory, respond to quotes, manage orders, publish supply-gap requests, and submit supply offers to other requests.
- **Plantation Organizer:** create plantation projects and define species, quantities, dates, location, and budget/funding needs.
- **Donor / Investor:** explore projects and register a pledge or interest in supporting a project.
- **Admin:** review nursery verification, moderate listings/projects, handle reports, and review audit records.

Design roles as capabilities, not hard-coded UI-only checks. Enforce authorization on the server/API/database boundary too.

## 4. Recommended technical defaults

For this new project, use a straightforward TypeScript stack unless the environment presents a concrete blocker. If actual application code is later supplied, inspect and preserve its existing stack:

- Frontend: React + TypeScript + Vite.
- Routing: React Router.
- Styling: Tailwind CSS if practical for the current repository; otherwise use the project's existing styling solution.
- Backend: Node.js + TypeScript + Express or Fastify.
- Database: PostgreSQL.
- ORM/migrations: Prisma or Drizzle; choose one and use it consistently.
- Validation: Zod or an equivalent schema validation library.
- Testing: the stack's existing test runner; add focused unit/integration tests for business rules.
- Image storage: an object-storage abstraction; never store uploaded file bytes in database rows by default.

Do not add all integrations up front. Keep the MVP locally runnable, document environment variables in `.env.example`, and never commit secrets. If a reliable database/storage service is not configured, provide setup instructions rather than pretending a live service exists.

## 5. Architecture and maintainability

- Keep frontend, backend, database access, validation, and business rules in clearly separated modules.
- Prefer small, focused components and files over giant pages, `App.tsx`, or `server.ts` files.
- Keep API routes thin; put reusable business logic in services/use-cases.
- Use typed request/response shapes and validate untrusted input on the server.
- Keep reusable UI components for forms, buttons, tables, status badges, dialogs, loading states, empty states, and error states.
- Use pagination for list endpoints and avoid loading every listing/order at once.
- Provide useful loading, success, empty, and error states.
- Avoid unnecessary abstractions, premature microservices, and dependencies that do not serve a current requirement.
- Keep README setup instructions aligned with actual commands and current repository structure.

## 6. Domain rules that must remain correct

### Plant listings and stock

- Store prices using a database decimal type or integer minor units, never binary floating-point arithmetic for money.
- Store whole-plant quantities as non-negative integers for the initial release.
- A nursery owner may create or edit only listings belonging to a nursery they are authorized to manage.
- Preserve agreed prices and quantities on quote/order records so later listing edits do not change historical records.
- Do not expose a listing as available when it is inactive or out of stock.

### Quotes and orders

- A quote request is not an accepted order.
- A quote must define its price/quantity and validity or expiration rules clearly.
- Do not mark an order accepted simply because a buyer submits an inquiry.
- Protect inventory and order transitions against duplicate submissions and concurrent updates.
- Keep valid order state transitions explicit and reject invalid transitions on the server.
- Do not implement payment processing or imply that money was charged in the MVP.

### Nursery collaboration — critical feature

A supply-gap request includes the total requirement and current stock. Derive:

`quantityNeeded = max(0, totalRequired - stockAvailable)`

Offers must be recorded individually and associated with one request and one supplying nursery. Track offer states such as `Pending`, `Accepted`, `Rejected`, and `Withdrawn`.

- Only eligible/verified nursery accounts may submit offers, according to the current verification policy.
- Offered quantity must be a positive integer.
- Validate the request is open and has enough remaining demand before acceptance.
- Count accepted offers toward committed supply; pending/rejected/withdrawn offers must not be counted as secured supply.
- Recalculate remaining demand using accepted commitments only.
- Handle concurrent offer acceptances atomically (database transaction/locking or an equivalent safe mechanism). Accepted commitments may never exceed the request's original required gap.
- Distinguish **supply committed** from **plants delivered**. An accepted offer is not proof of delivery.
- Preserve an audit-friendly history of offer status changes.
- Do not assume Nursery A is the legal seller of Nursery B/C stock. Keep supplier identity and quantities visible and let the parties agree on fulfillment/payment arrangements.

### Projects and pledges

- Project support is a coordination workflow in the MVP, not a payment flow.
- A pledge is an intention or commitment, not proof that money has been received.
- Keep pledge statuses explicit and never show pledged amounts as received funds without a verified receipt process.

### Security and privacy

- Enforce authorization on the backend for every protected resource; hiding a button is not authorization.
- Hash passwords using a reputable password-hashing algorithm. Never store plain-text passwords.
- Use secure session/cookie or token handling appropriate to the chosen architecture.
- Validate and normalize all untrusted inputs; use safe database query APIs/ORM.
- Rate-limit authentication and abuse-prone routes where supported.
- Restrict private messages and verification records to authorized users. Verification documents must not be publicly served.
- Collect sensitive identity information only if essential. Never expose private documents, secrets, password hashes, or internal tokens in API responses or logs.
- Keep credentials in environment variables and provide `.env.example` with placeholders only.
- Log administrative changes and important status transitions without logging secrets.

## 7. UX and accessibility

- Build responsive layouts for mobile, tablet, and desktop.
- Use a professional, trustworthy environmental/B2B visual language: forest green, neutral backgrounds, clear typography, and restrained accent colors.
- Prioritize clarity of quantity, price, availability, nursery verification, location, and request status.
- Make the supply-gap flow easy to understand: total needed, current stock, quantity still needed, offers accepted, and remaining quantity.
- Use semantic HTML, associated labels, keyboard-operable controls, visible focus states, and sufficient contrast.
- Include loading, empty, error, and success states on data-driven screens.
- Avoid inventing ratings, verification badges, impact totals, testimonials, or business data. Clearly identify seeded/demo data.
- Use PKR formatting for money and Karachi as the initial target market. Do not hard-code Karachi into logic that should support other cities.

## 8. Testing and verification

For each phase:

1. Discover and use the project's actual package manager and scripts.
2. Run focused tests for changed logic.
3. Run type-check/lint/build commands that exist and are relevant.
4. Add regression tests for meaningful bugs and business rules.
5. If a command cannot run because dependencies/services are missing, report the exact blocker and the command; do not claim success.
6. For database changes, create migrations and verify the documented local migration/seed process.
7. Before completion, inspect the diff for accidental unrelated changes, debug statements, secrets, broken imports, and placeholder controls.

At minimum, collaboration tests must eventually cover: quantity calculation, pending offers not counting as committed supply, accepting offers, rejected/withdrawn offers, concurrent acceptance, requests with zero gap, closed requests, unauthorized suppliers, and over-commit prevention.

## 9. Scope control

Unless the user explicitly changes scope, the first usable release does **not** include:

- Integrated online payments, escrow, or automatic donation collection.
- Automated delivery/route optimization.
- Complex investor returns, securities, or financial products.
- Native mobile applications.
- Microservices or AI recommendations.
- Claims of environmental impact without a defined verification process.

Create only what the current phase requires. Keep future features in documentation rather than building them prematurely.

## 10. Definition of done for any phase

A phase is done when all of the following are true:

- The phase's acceptance criteria are implemented.
- Relevant tests/type-check/lint/build have been run when available.
- No known critical regression introduced by the phase remains unresolved.
- Setup/documentation is updated if commands, environment variables, routes, or schema changed.
- The completion summary accurately lists what was and was not verified.
- The code remains understandable to a junior developer who will maintain it.
