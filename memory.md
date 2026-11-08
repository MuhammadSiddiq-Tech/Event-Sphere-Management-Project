# EventSphere Management — Project Memory

> **Purpose:** Single source of truth for _context that must survive between work sessions_ (human or AI). Read this file **first** at the start of every session; update it **last** at the end of every session.
> **Related docs:** [prd.md](./prd.md) · [architecture.md](./architecture.md) · [design.md](./design.md) · [rules.md](./rules.md) · [tasks.md](./tasks.md)

---

## 0. How to Use This File

1. **Start of session:** read §1 (snapshot), §2 (status), §8 (open questions), and the latest entry in §10 (session log).
2. **During work:** if you make a decision that others must know, add it to §5 (decision log) immediately.
3. **End of session:** update §2 (status), tick items in `tasks.md`, append an entry to §10, and move resolved questions out of §8.
4. **Never store secrets** (API keys, passwords, connection strings) here.
5. If this file conflicts with `prd.md` / `architecture.md`, **the PRD and architecture win** — fix this file.

---

## 1. Project Snapshot

| Item                                  | Value                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                              | EventSphere Management — expo & trade-show management platform                                                                                                                                                       |
| **Origin**                            | Aptech **eProject** (React + Node.js + MongoDB; Express deliberately omitted — D-013). Deliverables: working app, source code, full documentation, demo video, sent to the eProjects Team                            |
| **Client (fictional)**                | EventSphere Management — large-scale expo organiser                                                                                                                                                                  |
| **Problem**                           | Manual registration, disjointed communication, no real-time event info for organizers, exhibitors, attendees                                                                                                         |
| **Solution**                          | Web app with 3 roles (admin/organizer, exhibitor, attendee): auth, expo + floor plan + booth management, exhibitor applications, schedules, search, messaging, notifications, analytics, feedback, real-time updates |
| **Stack**                             | MongoDB · **plain Node.js 20 `http` (no Express)** · React 18 (Vite) · **Bootstrap 5.3 + React-Bootstrap** · Socket.IO · TanStack Query · Zod · JWT                                                                  |
| **Repo layout**                       | Monorepo: `/client`, `/server`, `/docs`                                                                                                                                                                              |
| **Source brief**                      | `MERN-EventSphere_Management.docx` (Introduction, Objectives, Background, FRs, NFRs, HW/SW)                                                                                                                          |
| **Hardware/Software note from brief** | Windows OS + MongoDB/Express/React/Node.js + any editor. (Project owner chose to omit Express — D-013.) (Brief lists very old hardware specs — ignore; target modern dev machines.)                                  |

---

## 2. Current Status

| Area                       | Status           | Notes                                              |
| -------------------------- | ---------------- | -------------------------------------------------- |
| Requirements analysis      | ✅ Done          | Brief digested → `prd.md`                          |
| Architecture               | ✅ Baseline v1.0 | `architecture.md`                                  |
| Design system & wireframes | ✅ Baseline v1.0 | `design.md`                                        |
| Rules/conventions          | ✅ Baseline v1.0 | `rules.md`                                         |
| Task plan                  | ✅ Baseline v1.0 | `tasks.md`                                         |
| Repo scaffolding           | ✅ Done          | Phase 0 complete — committed & pushed to main      |
| Backend                    | ✅ Done          | Phase 1 complete (T-1.1–T-1.10, 117 tests passing) |
| Authentication & Users     | 🔄 In progress   | T-2.1–T-2.11 complete (181 backend tests + 7 client tests passing); T-2.12 (Core UI components) next |
| Testing                    | ⬜ Not started   |                                                    |
| Documentation (user/dev)   | ⬜ Not started   |                                                    |
| Demo video                 | ⬜ Not started   |                                                    |

**Current phase:** Phase 2 🔄 in progress (T-2.1–T-2.11 done).
**Next action:** T-2.4 (Refresh / logout / `GET /auth/me`), T-2.5 (`requireAuth`, `requireRole`, ownership helpers).

---

## 3. Glossary (Ubiquitous Language)

Use these exact terms in code, UI, and docs.

| Term                  | Meaning                                                            | Code name                            |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| **Expo**              | A single expo/trade-show event                                     | `Expo`                               |
| **Organizer / Admin** | Staff who run expos (same role)                                    | role `admin`                         |
| **Exhibitor**         | Company that exhibits at an expo                                   | role `exhibitor`, `ExhibitorProfile` |
| **Attendee**          | Visitor attending an expo                                          | role `attendee`                      |
| **Booth**             | A rentable space on the floor plan                                 | `Booth`                              |
| **Floor plan**        | 2D layout of an expo's booths                                      | `expo.floorPlan` + `Booth[]`         |
| **Application**       | Exhibitor's request to take part in an expo                        | `Application`                        |
| **Session**           | A scheduled talk/keynote/workshop                                  | `Session`                            |
| **Engagement**        | Attendee's bookmark or registration for a session                  | `SessionEngagement`                  |
| **Expo registration** | Attendee's ticket for an expo                                      | `ExpoRegistration`                   |
| **Reserve**           | Exhibitor claims an _available_ booth (needs approved application) | `POST /booths/:id/reserve`           |
| **Allocate / Assign** | Admin sets a booth to an exhibitor                                 | `status: 'allocated'`                |
| **Conversation**      | A 1:1 message thread                                               | `Conversation`                       |

---

## 4. Core Facts & Invariants (do not violate)

1. Roles are exactly `admin`, `exhibitor`, `attendee`. **Admins are never created via public registration.**
2. Passwords are hashed with bcrypt (cost ≥ 12); `passwordHash` is never returned by any API.
3. Access token lives **in memory** on the client; refresh token is an **httpOnly cookie**.
4. An exhibitor can reserve a booth **only after** their application for that expo is `approved`.
5. Booth reservation must be **atomic** — no double booking. Conflicts return `409`.
6. Sessions in the same room must **not overlap in time**.
7. All API responses use the envelope `{ success, data, meta? }` or `{ success:false, error:{code,message,details?} }`.
8. All inputs are validated with **Zod** at the route boundary.
9. Real-time events **invalidate** client queries; clients don't hand-edit server data.
10. Privacy: consent is stored with timestamp; users can export and delete their data.
11. Every list endpoint is paginated (default 20, max 100).
12. No secrets in the repo; `.env.example` is maintained.
13. **No Express** (or Express-style frameworks). HTTP is native `node:http` + `server/src/core`. **Bootstrap is the only CSS framework.**

---

## 5. Decision Log

> Format: `ID · date · decision · why · alternatives rejected`. Append only; supersede rather than edit.

| ID    | Date          | Decision                                                                                                                                                                                                                 | Why                                                | Rejected                              |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------- |
| D-001 | Project start | Modular monolith (plain Node.js `http`)                                                                                                                                                                                  | Right-sized; simpler ops for eProject              | Microservices (overkill)              |
| D-002 | Project start | Vite + React 18 (not CRA/Next)                                                                                                                                                                                           | Fast, matches "React" requirement; CRA deprecated  | Next.js (SSR not required)            |
| D-003 | Project start | JWT access (memory) + rotating refresh (httpOnly cookie)                                                                                                                                                                 | XSS-safer than localStorage                        | Single long-lived token               |
| D-004 | Project start | Socket.IO for real-time                                                                                                                                                                                                  | Rooms, reconnection, ack                           | Raw WS, polling/SSE only              |
| D-005 | Project start | Custom SVG floor-plan                                                                                                                                                                                                    | Accessible, controllable                           | Image map, heavy canvas lib           |
| D-006 | Project start | Zod for validation                                                                                                                                                                                                       | Clear errors; shared vocabulary                    | Joi, Yup                              |
| D-007 | Project start | TanStack Query + Context (no Redux)                                                                                                                                                                                      | Server-state heavy app                             | Redux Toolkit                         |
| D-008 | Project start | Bootstrap 5.3 + React-Bootstrap, themed via Sass tokens from `design.md` _(revised in v1.1; was Tailwind)_                                                                                                               | Owner preference; fast responsive UI               | Tailwind, MUI                         |
| D-009 | Project start | Admin = Organizer (one role)                                                                                                                                                                                             | Brief says "admin/organizer"                       | Separate organizer role (YAGNI)       |
| D-010 | Project start | Exhibitor→exhibitor messaging limited to neighbours in same expo                                                                                                                                                         | Brief: "neighboring exhibitors"; limits spam       | Open messaging between all exhibitors |
| D-011 | Project start | Language: JavaScript (ES2022) + JSDoc                                                                                                                                                                                    | Aligned with eProject scope; lower barrier         | TypeScript (optional later)           |
| D-012 | Project start | Email via Nodemailer (Ethereal/MailHog in dev)                                                                                                                                                                           | Needed for reset + reminders                       | Third-party SDK lock-in               |
| D-013 | v1.1          | **No Express.** Backend = native Node.js `http` + small in-house core (`server/src/core`)                                                                                                                                | Owner requirement                                  | Express, Koa, Fastify, NestJS         |
| D-014 | v1.1          | **Bootstrap** is the only CSS framework; JS behaviours via React-Bootstrap, not Bootstrap's JS bundle                                                                                                                    | Owner requirement; avoids DOM conflicts with React | Tailwind, MUI, mixed frameworks       |
| D-015 | v1.1          | Replace Express-ecosystem packages with in-house/neutral equivalents: Multer→`busboy`; helmet/cors/hpp/mongo-sanitize/express-rate-limit→`core/security.js` + `core/rate-limit.js`; swagger-ui-express→static Swagger UI | They depend on Express conventions                 | Adapters/shims around Express         |

---

## 6. Conventions Cheat-Sheet

_(Full details in `rules.md`.)_

- **Branches:** `main` (protected) ← `feat/<scope>-<short>` · `fix/…` · `chore/…`
- **Commits:** Conventional Commits — `feat(booths): atomic reserve endpoint`
- **Files:** server `kebab-case.js` with suffix (`expo.service.js`); client components `PascalCase.jsx`, hooks `useThing.js`
- **API paths:** plural nouns, kebab-case, `/api/v1/...`
- **DB:** collections plural lowercase; fields camelCase; always define indexes in the model
- **Env:** only via `config/env.js` (validated with Zod) — never `process.env` directly elsewhere
- **Tests:** colocate `*.test.js`; every service function has a unit test; every route has an integration test per role (allowed + denied)
- **Definition of Done:** see `rules.md` §14

---

## 7. Environment & Local Setup (non-secret)

| Item            | Value                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Node            | 20 LTS                                                                                                                |
| Package manager | npm (workspaces)                                                                                                      |
| API dev URL     | `http://localhost:5000`                                                                                               |
| Client dev URL  | `http://localhost:5173`                                                                                               |
| Mongo (dev)     | `mongodb://localhost:27017/eventsphere` (replica set enabled for transactions — e.g. Docker `--replSet rs0` or Atlas) |
| Mail (dev)      | MailHog `localhost:8025` or Ethereal                                                                                  |
| API docs        | `http://localhost:5000/api/docs` (dev only)                                                                           |
| Seed            | `npm run seed -w server` → creates admin, sample expos, exhibitors, attendees                                         |

**Seed credentials (dev only):** `admin@eventsphere.test` / `exhibitor@eventsphere.test` / `attendee@eventsphere.test` — password set in `server/seed/README` (not stored here).

---

## 8. Open Questions

| #    | Question                                                                                             | Impact          | Owner   | Status                                                               |
| ---- | ---------------------------------------------------------------------------------------------------- | --------------- | ------- | -------------------------------------------------------------------- |
| Q-01 | Is a **payment** step for booths required? (Brief doesn't mention it)                                | Scope           | Product | Assumed **No** (price is informational)                              |
| Q-02 | Should exhibitors need approval **per expo**, or once globally?                                      | Data model      | Product | Assumed **per expo**                                                 |
| Q-03 | Should attendees need an expo ticket before registering for sessions?                                | Rules           | Product | Assumed **Yes** (must be registered for the expo)                    |
| Q-04 | Do we need QR check-in at the venue?                                                                 | Scope           | Product | Assumed **Out of scope** (ticket code only)                          |
| Q-05 | Multi-language / RTL support?                                                                        | UI              | Product | Assumed **English only**                                             |
| Q-06 | Which hosting will be used for the demo?                                                             | Deployment      | Dev     | Open — default Render + Atlas + Netlify                              |
| Q-07 | Is a shared Zod package between client/server worth the setup cost?                                  | DX              | Dev     | Open — start duplicated, revisit                                     |
| Q-08 | Session capacity: hard limit with waitlist, or soft?                                                 | Rules           | Product | Assumed **hard limit, no waitlist**                                  |
| Q-09 | The brief names the **MERN** stack. Will the eProjects Team accept a Node-only backend (no Express)? | Evaluation risk | Owner   | Open — owner decided to proceed (D-013); mention in submission notes |

---

## 9. Known Risks & Watch-Outs

- **Double booking** under concurrency → covered by atomic update + test (see `architecture.md` §6.3).
- **Replica set requirement** for transactions in local Mongo → provide docker-compose with `--replSet`.
- **Hand-rolled HTTP core** can sprawl or hide security bugs → keep `core/` small (~400 lines), unit-test each module, security-review it (T-9.3); never re-implement framework features we don't need.
- **Bootstrap JS vs React** → use React-Bootstrap only; no `data-bs-*` imperative behaviour.
- **Floor-plan editor** can balloon in scope → MVP = rectangles + grid snap only.
- **Socket auth expiry** → on token refresh, reconnect socket with the new token.
- **Timezones** → store UTC; display in expo venue timezone; label it.
- **Deliverables outside code** (user docs, developer docs, **demo video**) are mandatory in the brief — don't leave to the end (see `tasks.md` Phase 9).

---

## 10. Session Log (append newest at the bottom)

### Session 0 — Planning

- **Input:** `MERN-EventSphere_Management.docx` analysed.
- **Output:** Created `architecture.md`, `design.md`, `memory.md`, `prd.md`, `rules.md`, `tasks.md` (baseline v1.0).
- **Decisions:** D-001 → D-012 recorded above.
- **Assumptions:** Q-01 → Q-08 recorded in §8.
- **Next:** Phase 0 scaffolding.

### Session 2 — Nov 8 2026 — Phase 0 + T-1.10 scaffold and test verification
- **Goal:** Complete repo scaffolding, client/server setup, in-house native HTTP core, and verify test harness.
- **Done:** Phase 1 complete (T-1.1 to T-1.10). Phase 2 started: T-2.1 (User model with bcrypt hashing, passwordHash select:false, toJSON transform), T-2.2 (Register endpoint: roles exhibitor/attendee only, consent required, duplicate email 409, bcrypt cost 12), and T-2.3 (Login endpoint: JWT access token, rotating refresh token stored in httpOnly cookie, reuse detection family logic).
- **Testing:** 21 test suites, 129/129 tests passing green.
- **Git:** Staged, committed with conventional commits, and pushed directly to `origin/main` (`MuhammadSiddiq-Tech/Event-Sphere-Management-Project`).
- **Next:** Phase 2 Auth: T-2.4 (Refresh / logout / `GET /auth/me`), T-2.5 (`requireAuth`, `requireRole`, ownership helper).
- **Goal:** Apply owner's stack choice: React + Bootstrap, plain Node.js without Express; rest unchanged.
- **Done:** Updated all six docs (architecture §4/§5.3/§11/ADRs, design §5/§6.1/§11, rules §3/§4/§5, tasks Phase 0–1, prd header, this file).
- **Decisions:** D-013, D-014, D-015; D-008 revised.
- **Open:** Q-09 (is Node-only backend acceptable for the brief's "MERN"?).
- **Next:** Phase 0 scaffolding, then T-1.10 (HTTP core) before other Phase 1 tasks.

### Session 3 — Nov 8 2026 — Phase 2: T-2.4 through T-2.8 Complete
- **Goal:** Complete T-2.4 (Refresh token rotation & logout), T-2.5 (Auth & RBAC middleware, /me endpoint), T-2.6 (Forgot & reset password with hashed single-use tokens and session revocation), T-2.7 (Auth rate-limit verification), and T-2.8 (Users profile update & password change).
- **Done:**
  - `T-2.4` + `T-2.5`: Refresh token rotation endpoint `POST /api/v1/auth/refresh`, logout `POST /api/v1/auth/logout`, profile endpoint `GET /api/v1/auth/me`, middleware `requireAuth`, `requireRole`, `assertOwnership`.
  - `T-2.6`: `PasswordResetToken` model with 30-min TTL, `POST /api/v1/auth/forgot-password` (no email enumeration), `POST /api/v1/auth/reset-password` (bcrypt rehash, session invalidation, replay prevention).
  - `T-2.7`: Unit test suite verifying 10 req/15min auth rate limiter, headers, Retry-After, and keyFn.
  - `T-2.8`: Users module (`server/src/modules/users/`) with `PATCH /api/v1/users/me` (name, phone, avatarUrl updates) and `PATCH /api/v1/users/me/password` (current password verification, bcrypt hash, session purge).
- **Testing:** 25 test suites, 179/179 tests passing green.
- **Git:** Staged, committed with conventional commits, and pushed directly to `origin/main` (`MuhammadSiddiq-Tech/Event-Sphere-Management-Project`).
- **Next:** Frontend Phase 2 tasks (T-2.10 to T-2.14).

### Session 4 — Nov 8 2026 — Phase 2: T-2.9 Complete (Backend Phase 2 100% Finished)
- **Goal:** Implement idempotent seed script for default admin, exhibitor, and attendee accounts.
- **Done:**
  - `T-2.9`: Implemented `server/seed/index.js` with `seedDatabase()` creating `admin@eventsphere.test` (Admin), `exhibitor@eventsphere.test` (Exhibitor), and `attendee@eventsphere.test` (Attendee) using bcrypt hashing. Verified CLI execution via `npm run seed -w server` and cross-platform native `.env` loading in `server/src/config/env.js`.
  - Added integration test suite `server/tests/seed/seed.test.js` validating first-time creation and multi-run idempotency.
- **Testing:** 26 test suites, 181/181 tests passing green.
- **Git:** Staged, committed with conventional commits, and pushed directly to `origin/main`.
- **Next:** Frontend Phase 2: T-2.12 (Core UI components), T-2.13 (Auth pages), T-2.14 (Profile page).

### Session 5 — Nov 8 2026 — Phase 2: T-2.10 & T-2.11 Complete
- **Goal:** Build the React application shell, providers, role-based layouts, route guard, error pages, Axios client with single-flight refresh interceptor, and AuthContext.
- **Done:**
  - `T-2.11`: Implemented `client/src/lib/axios.js` with in-memory JWT storage (`setAccessToken`, `getAccessToken`), automatic `Authorization: Bearer` header injection, and single-flight 401 refresh token interceptor with request queue.
  - Implemented `client/src/context/AuthContext.jsx` with session bootstrapping on mount (`/auth/refresh`), login, register, logout, and token expiry listener.
  - `T-2.10`: Built `ProtectedRoute` (`client/src/components/ProtectedRoute.jsx`) with loading spinner, unauthenticated redirect to `/login` preserving target location, and unauthorized role redirect to 403.
  - Built error and landing pages: `ForbiddenPage` (403), `NotFoundPage` (404), `HomePage`, and role dashboard placeholders (`AdminDashboardPage`, `ExhibitorDashboardPage`, `AttendeeDashboardPage`).
  - Built role layouts: `PublicLayout`, `AdminLayout`, `ExhibitorLayout`, `AttendeeLayout` with responsive sidebars, offcanvas mobile navigation, and user menus.
  - Configured `client/vite.config.js` with test environment and `/api` dev proxy.
- **Testing:** 7/7 Vitest tests passing in client; production build compiles cleanly without errors (`dist/index.html` + chunks generated). 181 backend Jest tests pass.
- **Git:** Staged, committed with conventional commits, and pushed directly to `origin/main`.
- **Next:** T-2.12 (Core UI components: Button, Input, PasswordInput with strength meter, Card, Badge, Modal, Toast, Skeleton, EmptyState).


---

## 11. Quick Links

| Need                                        | Where             |
| ------------------------------------------- | ----------------- |
| What are we building / acceptance criteria? | `prd.md`          |
| How is it built? Data model? API?           | `architecture.md` |
| What does it look like? Flows? Components?  | `design.md`       |
| How must code be written?                   | `rules.md`        |
| What's next to do?                          | `tasks.md`        |
