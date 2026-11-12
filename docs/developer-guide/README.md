# EventSphere — Developer Guide

> **Version:** 1.0.0 · **Stack:** React 18 + Vite 5 · Plain Node.js `http` · MongoDB 6 + Mongoose 8  
> **Related docs:** [architecture.md](../../architecture.md) · [design.md](../../design.md) · [prd.md](../../prd.md) · [rules.md](../../rules.md)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Getting Started — Local Setup](#2-getting-started--local-setup)
3. [Project Architecture Overview](#3-project-architecture-overview)
4. [Folder Map](#4-folder-map)
5. [Design System & Component Conventions](#5-design-system--component-conventions)
6. [How to Add a New Feature Module](#6-how-to-add-a-new-feature-module)
7. [API Reference](#7-api-reference)
8. [Environment Variables](#8-environment-variables)
9. [Running Tests](#9-running-tests)
10. [Git Workflow & Commit Conventions](#10-git-workflow--commit-conventions)

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| **Node.js** | 20 LTS | Required — env uses `process.loadEnvFile()` (Node 20+) |
| **npm** | 10+ | Bundled with Node 20; workspaces used |
| **MongoDB** | 6.0+ | Local or [MongoDB Atlas](https://cloud.mongodb.com) free tier |
| **Git** | 2.40+ | Conventional Commits enforced via Husky |

**Optional but recommended:**

| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Run MongoDB + MailHog locally without installing them |
| [MailHog](https://github.com/mailhog/MailHog) | SMTP dev server — catch all outbound email locally |
| [MongoDB Compass](https://www.mongodb.com/products/compass) | GUI for inspecting collections |

---

## 2. Getting Started — Local Setup

### 2.1 Clone the Repository

```bash
git clone https://github.com/your-org/eventsphere.git
cd eventsphere
```

### 2.2 Install Dependencies

The repo uses **npm workspaces**. A single install at the root installs both `client` and `server` packages.

```bash
npm install
```

### 2.3 Configure Environment Variables

**Server** — copy the example file and fill in your values:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` (see [§8 Environment Variables](#8-environment-variables) for the full reference).

Minimum viable dev config:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/eventsphere
JWT_ACCESS_SECRET=dev-access-secret-32-chars-minimum!
JWT_REFRESH_SECRET=dev-refresh-secret-32-chars-minimum
```

**Client** — copy the example file:

```bash
cp client/.env.example client/.env
```

Default contents work out of the box for local development:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 2.4 Start MongoDB (Docker shortcut)

If you have Docker installed:

```bash
docker compose up -d mongo mailhog
```

Or connect to MongoDB Atlas — just paste the Atlas connection string into `MONGO_URI`.

### 2.5 Seed the Database

```bash
npm run seed
```

This creates the following default accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@eventsphere.test` | `Admin@1234` |
| Exhibitor | `exhibitor@eventsphere.test` | `Exhibitor@1234` |
| Attendee | `attendee@eventsphere.test` | `Attendee@1234` |

### 2.6 Run Development Servers

Start both client and server in one command:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:server   # API on http://localhost:5000
npm run dev:client   # React SPA on http://localhost:5173
```

> **API docs** (Swagger UI) are available at `http://localhost:5000/api/docs` in development. The raw OpenAPI JSON is at `http://localhost:5000/api/openapi.json`.

---

## 3. Project Architecture Overview

### 3.1 Monorepo Structure

EventSphere is an **npm workspaces monorepo** with two packages:

```
eventsphere/                    ← workspace root
├── client/                     ← React SPA (Vite)
├── server/                     ← Node.js API
├── docs/                       ← Documentation
├── .github/workflows/          ← CI/CD (GitHub Actions)
├── package.json                ← workspace root scripts & engines
├── architecture.md
├── design.md
├── prd.md
├── rules.md
├── tasks.md
└── memory.md
```

### 3.2 Tech Stack

#### Frontend (`/client`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Framework | **React 18** | Concurrent features, Suspense |
| Build Tool | **Vite 5** | Fast HMR, ESM-first |
| Language | JavaScript ES2022 + JSDoc | TypeScript optional |
| Routing | **React Router v6** | Nested routes, role guards |
| Server State | **TanStack Query v5** | Caching, retries, socket invalidation |
| Client State | React Context | Auth, theme, socket — no Redux |
| Forms | **React Hook Form** + Zod resolver | Shared validation vocabulary |
| UI Framework | **Bootstrap 5.3** + **React-Bootstrap** | Grid, utilities, accessible components |
| Theming | Sass variable overrides + CSS custom props | Tokens in `custom.scss` |
| Icons | Bootstrap Icons | SVG sprite imports |
| Charts | **Recharts** | Analytics dashboard |
| Floor Plan | Custom SVG component | Pan/zoom, accessible, admin drag-resize |
| Real-time | `socket.io-client` | Single shared connection per user |
| HTTP client | **Axios** | Interceptors for silent token refresh |
| Dates | **date-fns** | Timezone-safe formatting |
| Testing | **Vitest** + React Testing Library · **Playwright** (E2E) | |

#### Backend (`/server`)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Runtime | **Node.js 20 LTS** | No Express or any HTTP framework |
| HTTP Server | Native `node:http` + in-house `core/` | Router, pipeline, context, security (ADR-09) |
| Database | **MongoDB 6+** via **Mongoose 8** | Atlas or local |
| Auth | JWT access token (memory) + rotating refresh (httpOnly cookie) | |
| Password Hashing | `bcryptjs` (cost ≥ 12) | |
| Validation | **Zod** | Per-route schemas |
| Real-time | **Socket.IO 4** | Rooms: user, expo, conversation, admin |
| Email | Nodemailer | Reset, reminders, approval notifications |
| Scheduling | `node-cron` | Reminders, expo transitions, token cleanup |
| File uploads | `busboy` + Cloudinary adapter | Logo, documents, banners |
| Logging | **pino** + pino-http | JSON structured logs, request IDs |
| Testing | **Jest** + Supertest + `mongodb-memory-server` | |

### 3.3 System Context

```
Browser (React SPA)
  │
  ├─► REST /api/v1/*  ─────────────────────────────► Node.js HTTP Server
  │                                                       │
  └─► WebSocket (Socket.IO) ───────────────────────►     │
                                                          ├─► MongoDB
                                                          ├─► SMTP (Nodemailer)
                                                          └─► File Storage (/uploads or Cloudinary)
```

### 3.4 Backend Request Flow

```
http.createServer
  → requestId → logger → secureHeaders → cors → rateLimit(global) → cookies → body → sanitise
  → router.match
  → [route middleware: requireAuth → requireRole → validate(zod)]
  → controller(ctx) → service → model
  → ctx.json → compress → res.end
```

### 3.5 Backend Layering Rules

| Layer | File | Responsibility | Must NOT |
|-------|------|---------------|----------|
| **Routes** | `*.routes.js` | Wire path + middleware + controller | Contain logic |
| **Controller** | `*.controller.js` | Parse `ctx`, call service, shape `ctx.json(...)` | Touch models directly |
| **Service** | `*.service.js` | Business rules, transactions, emit socket events | Know about `ctx`/`req`/`res` |
| **Model** | `models/*.model.js` | Schema, indexes, virtuals, hooks | Contain business workflows |
| **Schema** | `*.schema.js` | Zod validation schemas for that module | — |

---

## 4. Folder Map

### 4.1 `/client/src`

```
client/src/
│
├── api/                        ← Axios call functions, one file per resource
│   ├── admin.js                  Admin user management API calls
│   ├── analytics.js              Analytics tracking & aggregation calls
│   ├── applications.js           Exhibitor application submit/list/review calls
│   ├── attendee.js               Expo & session registration calls
│   ├── conversations.js          Messaging API calls
│   ├── exhibitors.js             Exhibitor profile CRUD & search calls
│   ├── expos.js                  Expo CRUD, publish, register calls
│   ├── feedback.js               Feedback submit & triage calls
│   ├── notifications.js          Notification list & mark-read calls
│   ├── sessions.js               Session CRUD, cancel, bookmark calls
│   └── users.js                  Profile update, password change, GDPR export
│
├── app/
│   └── App.jsx                   Root router (React Router v6), lazy route splits
│
├── components/                 ← Shared & feature-specific UI components
│   ├── admin/
│   │   ├── CancelSessionModal.jsx  Confirm-cancel dialog for admin sessions
│   │   ├── ExpoFormModal.jsx       Create/edit expo modal form
│   │   └── SessionModal.jsx        Create/edit session modal form
│   ├── attendee/
│   │   └── TicketModal.jsx         Expo registration ticket display
│   ├── exhibitor/
│   │   └── ExhibitorsDirectory.jsx Public exhibitor directory listing
│   ├── expos/
│   │   ├── ExpoCard.jsx            Expo list card (status badge, dates, CTA)
│   │   └── ExpoFilters.jsx         Search/filter bar for expo list
│   ├── floorplan/
│   │   ├── FloorPlan.jsx           SVG interactive floor plan (view/admin mode)
│   │   ├── FloorPlanControls.jsx   Zoom, pan, reset controls
│   │   ├── FloorPlanEditor.jsx     Admin drag-resize grid editor
│   │   ├── BoothDetailsDrawer.jsx  Offcanvas booth info panel
│   │   └── BoothReservationModal.jsx  Exhibitor reserve-booth dialog
│   ├── schedule/                   Session schedule list & calendar components
│   ├── ui/                         Reusable atoms: Spinner, Badge, EmptyState, etc.
│   └── ProtectedRoute.jsx          Role-guard wrapper for React Router routes
│
├── context/                    ← React contexts (avoid prop drilling)
│   ├── AuthContext.jsx            Authenticated user, login/logout actions
│   ├── SocketContext.jsx          Shared socket.io-client instance + event helpers
│   └── ThemeContext.jsx           Dark/light mode toggle, `data-bs-theme` on <html>
│
├── hooks/                      ← Custom TanStack Query hooks
│   ├── useExpos.js               useExpos, useExpo(id), useCreateExpo, etc.
│   ├── useSessions.js            useSessions(expoId), useMyAgenda, etc.
│   ├── useBooths.js              useBooths(expoId), useReserveBooth, etc.
│   ├── useApplications.js        useMyApplications, useApprove, etc.
│   ├── useNotifications.js       useNotifications, useMarkRead, etc.
│   ├── useConversations.js       useConversations, useMessages, useSendMessage
│   └── useAnalytics.js           useKpis, useEngagement, useBoothTraffic, etc.
│
├── layouts/                    ← Shared page layouts
│   ├── AdminLayout.jsx            Sidebar nav for /admin/* routes
│   ├── ExhibitorLayout.jsx        Sidebar nav for /exhibitor/* routes
│   ├── AttendeeLayout.jsx         Top-nav layout for /attendee/* routes
│   └── PublicLayout.jsx           Header + footer for public pages
│
├── lib/                        ← Infrastructure singletons
│   ├── axios.js                   Configured Axios instance + silent refresh interceptor
│   ├── socket.js                  Socket.IO client init + auth handshake
│   └── queryClient.js             TanStack Query client config (staleTime, retries)
│
├── pages/                      ← Route-level page components (one per route)
│   ├── admin/
│   │   ├── AdminDashboardPage.jsx    KPI summary + quick-action cards
│   │   ├── AdminExposPage.jsx        Expo list + create/edit/delete
│   │   ├── AdminFloorPlanEditorPage.jsx  Drag-resize floor plan editor
│   │   ├── AdminApplicationsPage.jsx    Application triage (approve/reject)
│   │   ├── AdminSchedulePage.jsx     Session CRUD + cancel
│   │   ├── AdminUsersPage.jsx        User list + deactivate/reactivate
│   │   ├── AdminAnalyticsPage.jsx    Recharts KPI dashboard + CSV export
│   │   └── AdminFeedbackPage.jsx     Feedback triage list
│   ├── attendee/
│   │   ├── AttendeeDashboardPage.jsx  Upcoming expos + bookmarked sessions
│   │   ├── AttendeeAgendaPage.jsx     Personal session agenda
│   │   └── AttendeeRegistrationsPage.jsx  Registered expos + tickets
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   ├── exhibitor/
│   │   ├── ExhibitorDashboardPage.jsx   Applications + booth + messages summary
│   │   ├── ExhibitorProfilePage.jsx     Edit company profile, logo, documents
│   │   ├── ApplicationWizardPage.jsx    Multi-step apply-to-expo wizard
│   │   ├── ExhibitorApplicationsPage.jsx  My applications list
│   │   ├── ExhibitorBoothsPage.jsx      My booth + floor plan view
│   │   └── ExhibitorsPage.jsx           Public exhibitor directory
│   ├── expos/
│   │   ├── ExposListPage.jsx            Public expo browse + search
│   │   └── ExpoDetailPage.jsx           Expo detail, booths, sessions, register
│   ├── account/
│   │   └── ProfilePage.jsx              Account settings, password, GDPR export
│   ├── messages/
│   │   └── MessagesPage.jsx             Conversation list + real-time chat
│   ├── notifications/
│   │   └── NotificationsPage.jsx        Notification inbox
│   ├── feedback/
│   │   └── FeedbackPage.jsx             Submit feedback form
│   ├── HomePage.jsx                     Public landing page
│   ├── NotFoundPage.jsx                 404
│   ├── ForbiddenPage.jsx                403
│   └── PrivacyPolicyPage.jsx
│
├── styles/
│   └── custom.scss             ← Bootstrap Sass overrides + brand tokens (see §5)
│
├── test/
│   └── setup.js                ← Vitest global setup (jsdom, mocks)
│
└── main.jsx                    ← React root mount, QueryClientProvider, AuthProvider
```

### 4.2 `/server/src`

```
server/src/
│
├── core/                       ← In-house HTTP framework (~350 lines, fully tested)
│   ├── router.js                 Path-to-RegExp router; get/post/put/patch/delete/options
│   ├── pipeline.js               Compose middlewares (Koa-style onion, one error boundary)
│   ├── context.js                Build ctx: req, res, params, query, body, user, log, helpers
│   ├── body.js                   JSON parser (1 MB limit) + busboy multipart handler
│   ├── cookies.js                Parse Cookie header; Set-Cookie serialiser (httpOnly/Secure)
│   ├── security.js               Secure headers, CORS, NoSQL-key sanitiser, query normaliser
│   ├── rate-limit.js             Sliding-window rate limiter (IP + email for /auth/*)
│   ├── static.js                 Serve /uploads safely (path traversal guard, nosniff)
│   ├── compress.js               gzip/brotli for JSON responses > 1 KB
│   └── errors.js                 ApiError classes + errorHandler → standard envelope
│
├── config/                     ← Boot-time singletons
│   ├── env.js                    Zod-validated process.env — only place env is read
│   ├── db.js                     Mongoose connect + isDbHealthy() helper
│   ├── logger.js                 pino + pino-http instance
│   └── constants.js              ROLES enum, STATUS enums, shared constants
│
├── models/                     ← Mongoose schemas (one file per collection)
│   ├── user.model.js
│   ├── exhibitorProfile.model.js
│   ├── expo.model.js
│   ├── booth.model.js
│   ├── application.model.js
│   ├── session.model.js
│   ├── expoRegistration.model.js
│   ├── sessionEngagement.model.js
│   ├── conversation.model.js
│   ├── message.model.js
│   ├── notification.model.js
│   ├── feedback.model.js
│   ├── analyticsEvent.model.js
│   └── password-reset-token.model.js
│
├── modules/                    ← Feature modules (one sub-folder per domain)
│   ├── auth/
│   │   ├── auth.routes.js        register, login, refresh, logout, me, forgot/reset-password
│   │   ├── auth.controller.js
│   │   ├── auth.service.js       bcrypt compare, JWT sign/verify, refresh rotation
│   │   └── auth.schema.js        Zod: registerSchema, loginSchema, …
│   ├── users/
│   │   ├── users.routes.js       /users/me CRUD + GDPR export + consent
│   │   ├── users.controller.js
│   │   ├── users.service.js
│   │   └── users.schema.js
│   ├── admin/
│   │   ├── admin.routes.js       /admin/users list/get/deactivate/reactivate
│   │   └── admin.controller.js
│   ├── expos/
│   │   ├── expos.routes.js       Expo CRUD + publish/unpublish
│   │   ├── expos.controller.js
│   │   ├── expos.service.js
│   │   ├── expos.schema.js
│   │   ├── booths.routes.js      Floor plan CRUD + reserve/assign/release/details
│   │   ├── booths.controller.js
│   │   ├── booths.service.js     Atomic reserve, transaction-based assign
│   │   └── booths.schema.js
│   ├── exhibitors/
│   │   ├── exhibitorProfile.routes.js  me CRUD + public list/detail
│   │   ├── exhibitorProfile.controller.js
│   │   ├── exhibitorProfile.service.js
│   │   └── exhibitorProfile.schema.js
│   ├── applications/
│   │   ├── applications.routes.js   submit, mine, listForExpo, approve, reject, withdraw
│   │   ├── applications.controller.js
│   │   ├── applications.service.js  approve/reject in Mongo transaction
│   │   └── applications.schema.js
│   ├── sessions/
│   │   ├── sessions.routes.js    CRUD + cancel + public schedule list
│   │   ├── sessions.controller.js
│   │   ├── sessions.service.js   Overlap-check, speaker management
│   │   └── sessions.schema.js
│   ├── attendee/
│   │   ├── attendee.routes.js    expo/session register, bookmark, my-agenda
│   │   ├── attendee.controller.js
│   │   ├── attendee.service.js
│   │   └── attendee.schema.js
│   ├── conversations/
│   │   ├── conversations.routes.js  list, start, messages, send, markRead
│   │   └── conversations.controller.js
│   ├── notifications/
│   │   ├── notifications.routes.js  list, unreadCount, markRead, markAllRead
│   │   └── notifications.controller.js
│   ├── feedback/
│   │   ├── feedback.routes.js    submit + admin triage
│   │   ├── feedback.controller.js
│   │   ├── feedback.service.js
│   │   └── feedback.schema.js
│   ├── analytics/
│   │   ├── analytics.routes.js   track event, KPIs, engagement, booth-traffic, export.csv
│   │   ├── analytics.controller.js
│   │   ├── analytics.service.js
│   │   └── analytics.schema.js
│   └── upload/
│       └── upload.routes.js      Multipart file upload endpoint
│
├── middleware/                 ← Route-level middleware
│   ├── auth.js                   requireAuth (JWT verify), requireRole(role), optionalAuth
│   ├── validate.js               validate(zodSchema) → 400 on failure
│   └── upload.js                 busboy multipart middleware, attaches ctx.files
│
├── sockets/                    ← Socket.IO setup
│   ├── index.js                  Attach io to http.Server, auth handshake, room joins
│   └── emitter.js                Helper: emit to user/expo/conversation/admin rooms
│
├── jobs/                       ← node-cron background jobs
│   ├── index.js                  Register all cron jobs at server start
│   └── expo-transitions.job.js   published → ongoing → completed transitions
│
├── services/                   ← Cross-module shared services
│   └── mailer.service.js         Nodemailer transporter + templated send helpers
│
├── utils/                      ← Pure utility functions
│   ├── pagination.js             parsePagination(query) + buildMeta(total, page, limit)
│   ├── response.js               Standard success/error envelope builders
│   ├── storage.js                Local-disk / Cloudinary upload adapter
│   └── tokens.js                 JWT sign/verify, refresh-token hash helpers
│
├── docs/                       ← API documentation (served in dev)
│   ├── openapi.json              OpenAPI 3.0 spec
│   └── swaggerUi.js              Renders Swagger UI HTML string
│
├── app.js                      ← Builds request handler; imports & registers all routes
└── server.js                   ← http.createServer + Socket.IO bootstrap + graceful shutdown
```

---

## 5. Design System & Component Conventions

### 5.1 Brand Colour Tokens

Defined in `client/src/styles/custom.scss` and exposed as CSS custom properties:

| Token | CSS variable | Hex | Usage |
|-------|-------------|-----|-------|
| Obsidian Navy | `--es-navy` | `#0A1128` | Dark backgrounds, `$dark`, body text |
| Royal Cobalt | `--es-cobalt` | `#0057FF` | Primary CTA, links, `$primary` |
| Electric Lime | `--es-lime` | `#D9F95B` | Accent, `.btn-lime`, highlights |
| Ice Slate | `--es-ice` | `#DCE8FF` | Light backgrounds, info surfaces |

### 5.2 Typography

| Role | Font | Weight | Class |
|------|------|--------|-------|
| Body / UI | Poppins | 400, 500, 600 | default (`$font-family-sans-serif`) |
| Brand / Wordmark | Syne | 800 | `.brand-logo-font` |
| Code / IDs | JetBrains Mono | 400 | `<code>`, `$font-family-monospace` |

Import fonts in `index.html` via Google Fonts (or self-host):

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

### 5.3 `custom.scss` Pattern

Always follow this order inside `custom.scss`:

```scss
// 1. Override Bootstrap Sass variables BEFORE importing Bootstrap
$primary:  #0057ff;
$dark:     #0a1128;
$font-family-sans-serif: 'Poppins', system-ui, sans-serif;

// 2. Import Bootstrap
@import "bootstrap/scss/bootstrap";
@import "bootstrap-icons/font/bootstrap-icons.css";

// 3. Declare CSS custom properties for the brand palette
:root {
  --es-cobalt: #0057ff;
  --es-lime:   #d9f95b;
  --es-navy:   #0a1128;
  --es-ice:    #dce8ff;
}

// 4. Brand utility classes, component overrides, dark-mode overrides
```

> **Rule:** Never import `bootstrap/dist/js/bootstrap.bundle.js`. Use React-Bootstrap components (`<Modal>`, `<Offcanvas>`, `<Dropdown>`, `<Toast>`) exclusively — they manage ARIA and DOM events the React way.

### 5.4 Dark Mode

Toggle by setting `data-bs-theme="dark"` on `<html>`. `ThemeContext` persists the preference to `localStorage` and applies it on mount.

```jsx
// ThemeContext.jsx (simplified)
document.documentElement.setAttribute('data-bs-theme', theme); // 'light' | 'dark'
```

### 5.5 Booth Status Colours

The floor plan uses semantic classes defined in `custom.scss`:

| Status | Class | Background |
|--------|-------|-----------|
| `available` | `.booth-available` | `#dcfce7` (green tint) |
| `reserved` | `.booth-reserved` | `#fef3c7` (amber tint) |
| `allocated` | `.booth-allocated` | `#e0e7ff` (cobalt tint) |
| `blocked` | `.booth-blocked` | `#e2e8f0` (slate tint) |

### 5.6 Real-time Pulse Animation

When a booth or card updates via a socket event, apply `.realtime-pulse` to draw attention. The animation respects `prefers-reduced-motion`.

```jsx
<Card className={recentlyUpdated ? 'realtime-pulse' : ''}>
```

### 5.7 Component Conventions

- **Never** call Axios directly in a component — use custom hooks (`useExpos`, `useBooths`, etc.).
- **Never** use `data-bs-*` attributes for Bootstrap JS (dropdowns, modals) — use React-Bootstrap.
- **Never** use `dangerouslySetInnerHTML`.
- Error boundaries wrap the app root **and** each lazy route chunk.
- All interactive SVG elements (booths) must have `aria-label` and be keyboard-focusable (`tabIndex={0}`, `onKeyDown` with Enter/Space).

---

## 6. How to Add a New Feature Module

This walkthrough adds a hypothetical `sponsors` feature as an example.

### Step 1 — Create the Mongoose Model (`server`)

```
server/src/models/sponsor.model.js
```

```js
import mongoose from 'mongoose';

const sponsorSchema = new mongoose.Schema({
  expo:    { type: mongoose.Schema.Types.ObjectId, ref: 'Expo', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  tier:    { type: String, enum: ['gold', 'silver', 'bronze'], required: true },
  logoUrl: String,
  website: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for expo-scoped queries
sponsorSchema.index({ expo: 1, tier: 1 });

export const Sponsor = mongoose.model('Sponsor', sponsorSchema);
```

### Step 2 — Write Zod Validation Schemas

```
server/src/modules/sponsors/sponsors.schema.js
```

```js
import { z } from 'zod';

export const createSponsorSchema = z.object({
  name:    z.string().min(2).max(100),
  tier:    z.enum(['gold', 'silver', 'bronze']),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
});

export const updateSponsorSchema = createSponsorSchema.partial();
export const sponsorIdSchema = z.object({ id: z.string().length(24) });
```

### Step 3 — Write the Service

```
server/src/modules/sponsors/sponsors.service.js
```

```js
import { Sponsor } from '../../models/sponsor.model.js';
import { ApiError } from '../../core/errors.js';

export const sponsorsService = {
  async listForExpo(expoId) {
    return Sponsor.find({ expo: expoId, isActive: true }).lean();
  },

  async create(expoId, data) {
    return Sponsor.create({ expo: expoId, ...data });
  },

  async update(id, data, adminId) {
    const sponsor = await Sponsor.findByIdAndUpdate(id, data, { new: true });
    if (!sponsor) throw new ApiError(404, 'NOT_FOUND', 'Sponsor not found');
    return sponsor;
  },

  async remove(id) {
    const sponsor = await Sponsor.findByIdAndDelete(id);
    if (!sponsor) throw new ApiError(404, 'NOT_FOUND', 'Sponsor not found');
  },
};
```

> **Rule:** Services never import `ctx`, `req`, or `res`. They throw `ApiError` on failure — the pipeline catches it.

### Step 4 — Write the Controller

```
server/src/modules/sponsors/sponsors.controller.js
```

```js
import { sponsorsService } from './sponsors.service.js';

export const sponsorsController = {
  async list(ctx) {
    const sponsors = await sponsorsService.listForExpo(ctx.params.id);
    ctx.json(200, sponsors);
  },

  async create(ctx) {
    const sponsor = await sponsorsService.create(ctx.params.id, ctx.body);
    ctx.json(201, sponsor);
  },

  async update(ctx) {
    const sponsor = await sponsorsService.update(ctx.params.sponsorId, ctx.body);
    ctx.json(200, sponsor);
  },

  async remove(ctx) {
    await sponsorsService.remove(ctx.params.sponsorId);
    ctx.noContent();
  },
};
```

### Step 5 — Register Routes

```
server/src/modules/sponsors/sponsors.routes.js
```

```js
import { router } from '../../core/router.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createSponsorSchema, updateSponsorSchema, sponsorIdSchema } from './sponsors.schema.js';
import { sponsorsController } from './sponsors.controller.js';

// Public
router.get('/api/v1/expos/:id/sponsors', sponsorsController.list);

// Admin only
router.post('/api/v1/expos/:id/sponsors',
  requireAuth, requireRole('admin'),
  validate({ body: createSponsorSchema }),
  sponsorsController.create
);

router.patch('/api/v1/sponsors/:sponsorId',
  requireAuth, requireRole('admin'),
  validate({ params: sponsorIdSchema, body: updateSponsorSchema }),
  sponsorsController.update
);

router.delete('/api/v1/sponsors/:sponsorId',
  requireAuth, requireRole('admin'),
  validate({ params: sponsorIdSchema }),
  sponsorsController.remove
);
```

### Step 6 — Register the Route Module in `app.js`

Add one line in `server/src/app.js` after the existing imports:

```js
import './modules/sponsors/sponsors.routes.js';
```

### Step 7 — Add the API Layer (`client`)

```
client/src/api/sponsors.js
```

```js
import api from '../lib/axios';

export const sponsorsApi = {
  listForExpo: (expoId) => api.get(`/expos/${expoId}/sponsors`).then(r => r.data.data),
  create:      (expoId, data) => api.post(`/expos/${expoId}/sponsors`, data).then(r => r.data.data),
  update:      (id, data) => api.patch(`/sponsors/${id}`, data).then(r => r.data.data),
  remove:      (id) => api.delete(`/sponsors/${id}`),
};
```

### Step 8 — Add a TanStack Query Hook

```
client/src/hooks/useSponsors.js
```

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsorsApi } from '../api/sponsors';

export function useSponsors(expoId) {
  return useQuery({
    queryKey: ['sponsors', expoId],
    queryFn:  () => sponsorsApi.listForExpo(expoId),
    enabled:  !!expoId,
  });
}

export function useCreateSponsor(expoId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => sponsorsApi.create(expoId, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['sponsors', expoId] }),
  });
}
```

### Step 9 — Build the React Page

```
client/src/pages/admin/AdminSponsorsPage.jsx
```

Use `useSponsors(expoId)` and `useCreateSponsor(expoId)` hooks. Wrap the page in an error boundary and show loading state with Bootstrap `<Spinner>`.

### Step 10 — Add Route in `App.jsx`

```jsx
// Inside the admin lazy route group
<Route path="sponsors" element={<AdminSponsorsPage />} />
```

### Step 11 — Write Tests

**Server (Jest + Supertest):**

```
server/tests/sponsors.test.js
```

- Unit-test `sponsorsService` with mocked Mongoose models.
- Integration-test the route with Supertest + `mongodb-memory-server`.

**Client (Vitest + RTL):**

```
client/src/pages/admin/admin-sponsors.test.jsx
```

- Mock `useSponsors` and assert the list renders.
- Mock `useCreateSponsor` and assert the form submits.

---

## 7. API Reference

**Base URL:** `http://localhost:5000/api/v1`  
**Content-Type:** `application/json`  
**Auth:** `Authorization: Bearer <accessToken>`

### Response Envelope

```jsonc
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 134 }  // pagination (list endpoints)
}

// Error
{
  "success": false,
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "path": "email", "message": "Invalid email" }]
  }
}
```

**Standard error codes:**

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Zod schema failure |
| `UNAUTHENTICATED` | 401 | Missing or expired access token |
| `FORBIDDEN` | 403 | Authenticated but wrong role / ownership check failed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate or race condition (e.g., booth already reserved) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

**Auth legend:** 🌐 public · 🔑 any authenticated user · 🅰 admin · 🅴 exhibitor · 🅣 attendee

---

### 7.1 Auth — `/api/v1/auth`

#### `POST /api/v1/auth/register` 🌐

Register a new exhibitor or attendee account. Admin accounts cannot be self-registered.

**Request body:**
```json
{
  "name":     "Jane Doe",
  "email":    "jane@example.com",
  "password": "SecurePass@1",
  "role":     "attendee",
  "consent": {
    "privacyAccepted": true,
    "marketing":       false
  }
}
```
**Response `201`:** `{ data: { user: { _id, name, email, role } }, accessToken }`  
**Sets:** `Set-Cookie: refreshToken=…; HttpOnly; Secure; SameSite=Strict`

---

#### `POST /api/v1/auth/login` 🌐

**Request body:**
```json
{ "email": "jane@example.com", "password": "SecurePass@1" }
```
**Response `200`:** `{ data: { user }, accessToken }`  
**Sets** refresh token cookie (7-day httpOnly).

---

#### `POST /api/v1/auth/refresh` 🌐 (cookie)

Rotate the refresh token and issue a new access token. Requires the `refreshToken` httpOnly cookie — no body needed.

**Response `200`:** `{ data: { accessToken } }` + new `Set-Cookie` refresh token.

**Security:** Replayed revoked tokens trigger full family revocation (all sessions logged out).

---

#### `POST /api/v1/auth/logout` 🔑

Revoke the current refresh token.

**Response `204`:** No content. Clears refresh token cookie.

---

#### `GET /api/v1/auth/me` 🔑

Return the authenticated user's public profile.

**Response `200`:** `{ data: { _id, name, email, role, phone, avatarUrl, lastLoginAt } }`

---

#### `POST /api/v1/auth/forgot-password` 🌐

Request a password reset email. Always returns `200` to prevent account enumeration.

**Request body:** `{ "email": "jane@example.com" }`  
**Response `200`:** `{ data: { message: "If this email exists, a reset link was sent." } }`

---

#### `POST /api/v1/auth/reset-password` 🌐

**Request body:**
```json
{ "token": "<raw-token-from-email>", "password": "NewPass@1" }
```
**Response `200`:** `{ data: { message: "Password updated." } }`  
Revokes all refresh tokens for the user.

---

### 7.2 Users — `/api/v1/users`

#### `PATCH /api/v1/users/me` 🔑

Update the authenticated user's display name, phone, or avatar URL.

**Request body (all optional):**
```json
{ "name": "Jane Smith", "phone": "+1-555-0100", "avatarUrl": "https://..." }
```
**Response `200`:** Updated user object.

---

#### `PATCH /api/v1/users/me/password` 🔑

**Request body:**
```json
{ "currentPassword": "OldPass@1", "newPassword": "NewPass@1" }
```
**Response `200`:** `{ data: { message: "Password changed." } }`

---

#### `GET /api/v1/users/me/export` 🔑

GDPR data export — returns a JSON archive of all personal data.

**Response `200`:** `{ data: { user, exhibitorProfile?, applications, registrations, messages, notifications } }`

---

#### `PATCH /api/v1/users/me/consent` 🔑

Update optional marketing/analytics consent.

**Request body:** `{ "marketing": true }`

---

#### `DELETE /api/v1/users/me` 🔑

Anonymise and delete the account. Requires password verification.

**Request body:** `{ "password": "CurrentPass@1" }`  
**Response `204`:** No content. All PII is replaced with anonymised values; aggregate analytics rows are retained.

---

#### `GET /api/v1/admin/users` 🅰

List all users with optional filters.

**Query params:** `?page=1&limit=20&role=exhibitor&q=keyword&isActive=true`  
**Response `200`:** Paginated user list.

---

#### `GET /api/v1/admin/users/:id` 🅰

Get a specific user's details.

---

#### `PATCH /api/v1/admin/users/:id/deactivate` 🅰

Deactivate a user account (sets `isActive: false`; they cannot login).

**Response `200`:** Updated user.

---

#### `PATCH /api/v1/admin/users/:id/reactivate` 🅰

Reactivate a previously deactivated account.

---

### 7.3 Expos — `/api/v1/expos`

#### `GET /api/v1/expos` 🌐

List published, ongoing, and completed expos with pagination and full-text search.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Default `1` |
| `limit` | number | Default `20`, max `100` |
| `q` | string | Full-text search on title, description, theme |
| `status` | string | Filter: `published` \| `ongoing` \| `completed` |
| `sort` | string | `-startDate` (default), `startDate`, `title` |

**Response `200`:** `{ data: [Expo], meta: { page, limit, total } }`

---

#### `GET /api/v1/expos/slug/:slug` 🌐

Fetch an expo by its URL slug.

---

#### `GET /api/v1/expos/:id` 🌐

Fetch an expo by MongoDB ObjectId. Admins see drafts; public users only see published/ongoing/completed.

---

#### `POST /api/v1/expos` 🅰

Create a new expo (starts in `draft` status).

**Request body:**
```json
{
  "title":       "TechExpo 2027",
  "description": "...",
  "theme":       "Innovation",
  "startDate":   "2027-03-01T09:00:00Z",
  "endDate":     "2027-03-03T18:00:00Z",
  "venue": {
    "name":    "Convention Center",
    "address": "123 Main St",
    "city":    "Karachi",
    "country": "Pakistan"
  }
}
```
**Response `201`:** Created expo document.

---

#### `PATCH /api/v1/expos/:id` 🅰

Update expo metadata (all fields optional/partial).

---

#### `POST /api/v1/expos/:id/publish` 🅰

Transition expo from `draft` → `published`.

---

#### `POST /api/v1/expos/:id/unpublish` 🅰

Revert from `published` back to `draft`.

---

#### `DELETE /api/v1/expos/:id` 🅰

Delete an expo. Only allowed when status is `draft` or `cancelled`. Running expos cannot be deleted.

---

#### `POST /api/v1/expos/:id/register` 🅣

Register the authenticated attendee for a published/ongoing expo. Returns a unique ticket code.

**Response `201`:** `{ data: { ticketCode, expo } }`

---

#### `GET /api/v1/expos/me/registrations` 🅣

List expos the current attendee is registered for.

---

#### `GET /api/v1/expos/:id/registration` 🔑

Check whether the current user is registered for a specific expo.

---

### 7.4 Booths — `/api/v1/expos/:id/booths` & `/api/v1/booths`

#### `GET /api/v1/expos/:id/booths` 🌐

Return all booths for the expo with their status, coordinates, and exhibitor info (for public floor plan view).

**Query params:** `?status=available&size=medium`

---

#### `GET /api/v1/expos/:id/booths/:boothId` 🌐

Get a single booth's full detail.

---

#### `POST /api/v1/expos/:id/booths` 🅰

Add a booth to an expo's floor plan (expo must be in `draft` status).

**Request body:**
```json
{
  "code": "A-01",
  "x": 100, "y": 200, "w": 80, "h": 60,
  "size": "medium",
  "price": 500
}
```

---

#### `PUT /api/v1/expos/:id/booths` 🅰

Bulk replace the entire floor plan layout (admin floor plan editor save). Body is an array of booth objects.

---

#### `PATCH /api/v1/expos/:id/booths/:boothId` 🅰

Update a single booth's metadata/position.

---

#### `DELETE /api/v1/expos/:id/booths/:boothId` 🅰

Delete a booth (expo must be in `draft` status).

---

#### `POST /api/v1/booths/:id/reserve` 🅴

Atomically reserve an `available` booth. Exhibitor must have an `approved` application for the expo.

**Returns `409 CONFLICT`** if the booth was already taken (race-condition safe — uses `findOneAndUpdate` with `{status:'available'}` guard).

---

#### `POST /api/v1/booths/:id/assign` 🅰

Admin assigns a booth to a specific exhibitor.

**Request body:** `{ "exhibitorId": "<ObjectId>" }`

---

#### `POST /api/v1/booths/:id/unassign` 🅰

Admin removes an exhibitor assignment from a booth.

---

#### `POST /api/v1/booths/:id/release` 🔑

Release a reserved/allocated booth back to `available` (exhibitor can release their own; admin can release any).

---

#### `PATCH /api/v1/booths/:id/details` 🅴

Update the exhibitor's own booth showcase copy, product list, and staff list.

**Request body:**
```json
{
  "details": {
    "showcase":  "Our latest IoT devices",
    "products":  ["SmartHub Pro", "EdgeSensor X"],
    "staff":     [{ "name": "Ali", "role": "Demo Lead" }]
  }
}
```

---

### 7.5 Exhibitor Profiles — `/api/v1/exhibitors`

#### `GET /api/v1/exhibitors` 🌐

Paginated public exhibitor directory with full-text search.

**Query params:** `?q=solar&category=energy&expo=<expoId>&page=1&limit=20`

---

#### `GET /api/v1/exhibitors/:userId` 🌐

Public exhibitor profile including booth location.

---

#### `GET /api/v1/exhibitors/me` 🅴

Own full profile including private documents.

---

#### `PUT /api/v1/exhibitors/me` 🅴

Upsert (create or replace) the exhibitor's profile.

**Request body:**
```json
{
  "companyName": "GreenTech Ltd.",
  "description": "...",
  "category":    "Energy",
  "tags":        ["solar", "renewable"],
  "website":     "https://greentech.example.com",
  "contact": { "email": "...", "phone": "...", "address": "..." }
}
```

---

### 7.6 Applications — `/api/v1/applications`

#### `POST /api/v1/expos/:id/applications` 🅴

Submit an application to exhibit at an expo.

**Request body:**
```json
{
  "productsServices": ["Solar panels", "EV chargers"],
  "preferredBooths":  ["<boothObjectId>"],
  "documents":        [{ "name": "Company brochure", "url": "...", "mimeType": "application/pdf" }]
}
```
**Response `201`:** Application document.

---

#### `GET /api/v1/applications/mine` 🅴

List all my applications across all expos.

---

#### `GET /api/v1/expos/:id/applications/mine` 🅴

My application for a specific expo.

---

#### `DELETE /api/v1/applications/:id` 🅴

Withdraw a `pending` application.

---

#### `GET /api/v1/applications` 🅰

List all applications across all expos.

**Query params:** `?status=pending&expo=<id>&page=1&limit=20`

---

#### `GET /api/v1/expos/:id/applications` 🅰

List all applications for a specific expo.

**Query params:** `?status=pending`

---

#### `POST /api/v1/applications/:id/approve` 🅰

Approve an application and optionally assign a booth. Runs in a Mongo transaction (requires replica set).

**Request body:**
```json
{ "boothId": "<ObjectId>", "reviewNote": "Welcome aboard!" }
```

---

#### `POST /api/v1/applications/:id/reject` 🅰

Reject an application with an optional note.

**Request body:** `{ "reviewNote": "Category mismatch." }`

---

### 7.7 Sessions — `/api/v1/sessions` & `/api/v1/expos/:id/sessions`

#### `GET /api/v1/expos/:id/sessions` 🌐

List the schedule for an expo.

**Query params:** `?day=2027-03-01&track=main&type=keynote&sort=startTime`

---

#### `GET /api/v1/sessions/:id` 🌐

Single session detail.

---

#### `GET /api/v1/sessions/me` 🔑

The authenticated user's personal agenda (registered + bookmarked sessions).

---

#### `POST /api/v1/expos/:id/sessions` 🅰

Create a session. The service checks for room/time overlap before inserting.

**Request body:**
```json
{
  "title":       "Keynote: Future of AI",
  "type":        "keynote",
  "startTime":   "2027-03-01T10:00:00Z",
  "endTime":     "2027-03-01T11:00:00Z",
  "location":    "Main Hall",
  "capacity":    500,
  "speakers":    [{ "name": "Dr. Ahmed", "org": "MIT", "bio": "..." }]
}
```

---

#### `PATCH /api/v1/sessions/:id` 🅰

Update a session. Triggers `schedule:updated` socket event to `expo:{expoId}` room.

---

#### `POST /api/v1/sessions/:id/cancel` 🅰

Cancel a session (sets `status: 'cancelled'`). Sends in-app notifications to registered attendees.

---

#### `DELETE /api/v1/sessions/:id` 🅰

Permanently delete a session.

---

#### `POST /api/v1/sessions/:id/register` 🅣

Register the authenticated attendee for a session.

---

#### `DELETE /api/v1/sessions/:id/register` 🅣

Unregister from a session.

---

#### `POST /api/v1/sessions/:id/bookmark` 🔑

Bookmark a session for any authenticated user.

---

#### `DELETE /api/v1/sessions/:id/bookmark` 🔑

Remove a bookmark.

---

### 7.8 Messaging (Conversations) — `/api/v1/conversations`

All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/conversations` | List my conversations |
| `POST` | `/api/v1/conversations` | Start a new conversation |
| `GET` | `/api/v1/conversations/:id` | Get conversation detail |
| `GET` | `/api/v1/conversations/:id/messages` | Paginated message history |
| `POST` | `/api/v1/conversations/:id/messages` | Send a message (also emits via socket) |
| `PATCH` | `/api/v1/conversations/:id/read` | Mark all messages as read |

**Start conversation body:**
```json
{ "participantId": "<userId>", "expoId": "<optional>" }
```

**Send message body:**
```json
{ "body": "Hello, is your booth available for a demo?" }
```

New messages also emit `message:new` to the `conversation:{id}` Socket.IO room.

---

### 7.9 Notifications — `/api/v1/notifications`

All routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/notifications` | List (paginated, `?unread=true` to filter) |
| `GET` | `/api/v1/notifications/unread-count` | Returns `{ data: { count: 3 } }` |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark a single notification read |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all notifications read |

New notifications are also pushed via `notification:new` on the `user:{userId}` Socket.IO room.

---

### 7.10 Analytics — `/api/v1/analytics`

#### `POST /api/v1/analytics/events` 🔑

Track a custom event (booth view, session view, etc.).

**Request body:**
```json
{
  "type":   "booth_view",
  "expo":   "<expoId>",
  "refId":  "<boothId>",
  "meta":   { "source": "floor_plan" }
}
```
Event types: `booth_view` · `profile_view` · `session_view` · `session_checkin` · `search`

---

#### `GET /api/v1/analytics/expos/:expoId/kpis` 🅰

Dashboard summary KPIs.

**Response `200`:**
```json
{
  "data": {
    "totalRegistrations": 234,
    "totalBoothViews":    1842,
    "sessionAttendance":  609,
    "approvedExhibitors": 18
  }
}
```

---

#### `GET /api/v1/analytics/expos/:expoId/engagement` 🅰

Registrations over time (time-series). Query param: `?days=30`

---

#### `GET /api/v1/analytics/expos/:expoId/booth-traffic` 🅰

Top booths by view count.

---

#### `GET /api/v1/analytics/expos/:expoId/session-popularity` 🅰

Sessions ranked by registration count.

---

#### `GET /api/v1/analytics/expos/:expoId/export.csv` 🅰

Download a CSV export of all analytics events for the expo.

---

### 7.11 Feedback — `/api/v1/feedback`

| Method | Auth | Path | Description |
|--------|------|------|-------------|
| `POST` | 🔑 | `/api/v1/feedback` | Submit feedback |
| `GET` | 🅰 | `/api/v1/feedback` | List all feedback (paginated) |
| `GET` | 🅰 | `/api/v1/feedback/:id` | Feedback detail |
| `PATCH` | 🅰 | `/api/v1/feedback/:id` | Update triage status / notes |

**Submit feedback body:**
```json
{
  "category": "suggestion",
  "message":  "Would love a print-schedule feature.",
  "rating":   4
}
```
Categories: `suggestion` · `issue` · `support`

---

### 7.12 System

#### `GET /health` 🌐

Liveness check. Returns `200 ok` when DB is connected; `503 degraded` otherwise.

**Response:**
```json
{
  "status":    "ok",
  "timestamp": "2026-11-12T17:00:00.000Z",
  "version":   "1.0.0",
  "db":        "connected"
}
```

---

#### `GET /metrics` 🌐 (restrict in prod)

Process metrics for operational monitoring.

**Response:**
```json
{
  "uptime_seconds": 3600,
  "db_connected":   true,
  "memory": {
    "rss_mb":        45.21,
    "heap_used_mb":  31.04,
    "heap_total_mb": 48.00,
    "external_mb":    1.22
  },
  "nodejs_version": "v20.18.0",
  "platform":       "linux",
  "pid":            1234,
  "timestamp":      "2026-11-12T17:00:00.000Z"
}
```

> **Note:** In production, protect `/metrics` behind an API gateway, internal network rule, or basic auth sidecar — it should not be publicly accessible.

---

#### `GET /api/docs` (dev only)

Swagger UI — interactive API documentation (auto-disabled in `NODE_ENV=production`).

#### `GET /api/openapi.json` (dev only)

Raw OpenAPI 3.0 JSON spec.

---

### 7.13 Upload

#### `POST /api/v1/upload` 🔑

Multipart file upload. Used internally by the exhibitor profile and document upload flows.

**Request:** `multipart/form-data` with field `file`.  
**Limits:** images ≤ 5 MB, documents ≤ 10 MB.  
**Response `200`:** `{ data: { url, mimeType, size } }`

---

## 8. Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `PORT` | No | `5000` | HTTP server port |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin (the React dev server URL) |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | ≥ 32-char secret for signing access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | — | ≥ 32-char secret for signing refresh tokens |
| `ACCESS_TOKEN_TTL` | No | `15m` | Access token expiry (ms/zeit/vercel format) |
| `REFRESH_TOKEN_TTL` | No | `7d` | Refresh token expiry |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor (10–14) |
| `SMTP_HOST` | No | `localhost` | SMTP host (use `localhost` with MailHog locally) |
| `SMTP_PORT` | No | `1025` | SMTP port |
| `SMTP_USER` | No | _(empty)_ | SMTP username |
| `SMTP_PASS` | No | _(empty)_ | SMTP password |
| `MAIL_FROM` | No | `noreply@eventsphere.test` | Sender address in outbound emails |
| `UPLOAD_DIR` | No | `./uploads` | Local disk upload directory |
| `CLOUDINARY_URL` | No | — | Cloudinary connection URL — when set, uploads go to Cloudinary instead of local disk |
| `LOG_LEVEL` | No | `info` | pino log level: `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

> **Important:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be **different** strings of at least 32 characters. The server will throw at boot if they are too short.

### Client (`client/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:5000/api/v1` | Base URL for Axios REST calls |
| `VITE_SOCKET_URL` | No | `http://localhost:5000` | Socket.IO server origin |

---

## 9. Running Tests

### 9.1 Server Tests (Jest + Supertest)

```bash
npm run test:server
```

Runs Jest in `server/`. Tests live in `server/tests/`. Each integration test suite spins up `mongodb-memory-server` — no real MongoDB needed.

**Run with watch mode:**

```bash
npm run test -w server -- --watch
```

**Run a single test file:**

```bash
npm run test -w server -- --testPathPattern=auth
```

### 9.2 Client Tests (Vitest + React Testing Library)

```bash
npm run test:client
```

Runs Vitest in `client/`. Test files are co-located next to their subjects with the naming convention `*.test.jsx` / `*.test.js`.

**Interactive UI:**

```bash
npm run test -w client -- --ui
```

**Coverage:**

```bash
npm run test -w client -- --coverage
```

### 9.3 End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

Requires both dev servers to be running. Start them first:

```bash
npm run dev &
npx wait-on http://localhost:5000/health http://localhost:5173
npm run test:e2e
```

Playwright config is at `client/playwright.config.js`. E2E tests cover critical flows:

- Auth: register → login → logout
- Exhibitor: apply to expo → admin approves → reserve booth
- Attendee: register for expo → register for session → check agenda

### 9.4 All Tests

```bash
npm run test         # server tests only (default)
npm run test:client  # client tests
npm run test:e2e     # Playwright E2E
```

---

## 10. Git Workflow & Commit Conventions

### 10.1 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — only fast-forward merges via PR |
| `develop` | Integration branch for features |
| `feature/<ticket>-<slug>` | Feature work, e.g. `feature/T-5.2-session-crud` |
| `fix/<slug>` | Bug fixes |
| `chore/<slug>` | Tooling, deps, docs |

**Workflow:**

1. `git checkout develop && git pull`
2. `git checkout -b feature/T-X.Y-description`
3. Work, commit often.
4. `git push origin feature/T-X.Y-description`
5. Open a Pull Request → `develop`; require at least one review.
6. Squash-merge (or rebase-merge) on approval.
7. `main` is updated from `develop` on release via a tagged PR.

### 10.2 Conventional Commits

Enforced by Husky + `commitlint`. Format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Usage |
|------|-------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, tooling |
| `ci` | CI/CD configuration |
| `revert` | Revert a previous commit |

**Scopes:** `auth` · `expos` · `booths` · `sessions` · `applications` · `analytics` · `ui` · `core` · `docs` · `ci`

**Examples:**

```
feat(sessions): add overlap validation before session creation

Checks (expo, location, startTime–endTime) range before inserting.
Returns 409 CONFLICT when an overlap is detected.

Closes #42
```

```
fix(booths): return 409 instead of 500 on concurrent reservation
```

```
docs(developer-guide): add API reference for analytics endpoints
```

```
chore(deps): upgrade mongoose to 8.9.0
```

### 10.3 Pre-commit Hooks (Husky + lint-staged)

On every commit, the following run automatically:

1. **ESLint** — lint changed `.js`/`.jsx` files
2. **Prettier** — format changed files
3. **commitlint** — validate the commit message format

Install hooks after a fresh clone:

```bash
npm install         # hooks are registered automatically via prepare script
```

### 10.4 CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on every push and pull request:

```
lint → test:server → test:client → build (client)
```

Deployment to staging/production runs on merge to `main` only.

---

## Appendix A — Architecture Decision Records (Summary)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-01 | Modular monolith (not microservices) | Right-size for the team; simpler ops |
| ADR-02 | MongoDB + Mongoose | Flexible docs for profiles/floor plans |
| ADR-03 | JWT access (memory) + refresh (httpOnly cookie) | Mitigates XSS; supports rotation & revocation |
| ADR-04 | Socket.IO for real-time | Rooms, acks, fallbacks; scales with Redis adapter |
| ADR-05 | Custom SVG floor plan | Full control, accessible, no heavy library |
| ADR-06 | Zod for validation on both sides | Single schema vocabulary; great error messages |
| ADR-07 | TanStack Query | Caching + socket-triggered invalidation |
| ADR-08 | Atomic Mongo ops for booth reservation | Prevents double-booking under concurrency |
| ADR-09 | **Plain Node.js `http`, no Express** | Owner requirement; fewer deps; full learning value |
| ADR-10 | **Bootstrap 5.3 + React-Bootstrap** | Fast responsive UI; built-in a11y patterns |

---

## Appendix B — Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `sessionReminders` | every minute | Sends 15-min pre-session notifications (in-app + email) |
| `expoStatusTransition` | hourly | Advances expo status: `published → ongoing → completed` |
| `tokenCleanup` | daily | Purges expired refresh and password-reset tokens |
| `analyticsRollup` | hourly (optional) | Pre-aggregates analytics counts for heavy dashboards |

---

## Appendix C — Socket.IO Events Reference

### Rooms

| Room | Joined By | Purpose |
|------|-----------|---------|
| `user:{userId}` | The user on connect | Personal notifications, DMs |
| `expo:{expoId}` | Clients viewing an expo | Schedule/booth/expo live updates |
| `conversation:{id}` | Conversation participants | Typing indicators, new messages |
| `admin:{expoId}` | Admins | Live analytics ticks, new applications |

### Server → Client Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `expo:updated` | `{ expoId, changes }` | Expo metadata edited |
| `booth:updated` | `{ boothId, status, exhibitor? }` | Reserve / assign / release |
| `schedule:updated` | `{ sessionId, action }` | Session created / updated / cancelled |
| `notification:new` | notification doc | Any notification created |
| `message:new` | message doc | Message sent in conversation |
| `application:new` | application summary | Exhibitor submits application |
| `application:reviewed` | application summary | Admin approves or rejects |
| `analytics:tick` | KPI delta | Throttled ≤ 1 per 5 s |

**Client rule:** socket events **invalidate TanStack Query keys** — they never mutate the cache directly.

---

*Last updated: November 2026 · EventSphere v1.0.0*
