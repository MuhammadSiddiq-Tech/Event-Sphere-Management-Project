# EventSphere Management

> Expo and trade-show management platform — React + Bootstrap 5 · Plain Node.js · MongoDB

## Quick Start (< 10 minutes)

### Prerequisites
- Node.js 20 LTS
- Docker (for MongoDB replica set + MailHog)

### 1. Clone & Install

```bash
git clone <repo-url> eventsphere
cd eventsphere
npm install
```

### 2. Environment Variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env — set JWT secrets at minimum
```

### 3. Start Infrastructure (Mongo replica set + MailHog)

```bash
docker compose up -d
# Wait ~10 seconds for replica set to initialise
```

### 4. Seed the Database

```bash
npm run seed
```

#### Demo Credentials (Seed Accounts)

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin / Organizer** | `admin@eventsphere.test` | `Admin@1234` | Full platform control, expos, floor plans, exhibitor approvals, analytics |
| **Exhibitor** | `exhibitor@eventsphere.test` | `Exhibitor@1234` | Expo applications, booth reservations, direct messaging |
| **Attendee** | `attendee@eventsphere.test` | `Attendee@1234` | Expo pass, session schedule, bookmarks, feedback |


### 5. Run Development Servers

```bash
npm run dev
# API:    http://localhost:5000
# Client: http://localhost:5173
# Docs:   http://localhost:5000/api/docs   (dev only)
# Mail:   http://localhost:8025            (MailHog)
```

### 6. Run Tests

```bash
npm run test:server   # Jest + Supertest + in-memory Mongo
npm run test:client   # Vitest + React Testing Library
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · Vite · Bootstrap 5.3 · React-Bootstrap · Sass |
| Backend | Node.js 20 native `http` (no Express) · custom core |
| Database | MongoDB 6 · Mongoose 8 |
| Real-time | Socket.IO 4 |
| Auth | JWT access token + rotating refresh (httpOnly cookie) |
| Validation | Zod |
| Email | Nodemailer · MailHog (dev) |

## Repo Layout

```
eventsphere/
├── client/          # React SPA
├── server/          # Node.js API + Socket.IO
├── docs/            # User guide, developer guide, API export
└── *.md             # Architecture, design, PRD, rules, tasks, memory
```

## Documentation

- **Core Specs:** [Architecture](./architecture.md) · [Product Requirements](./prd.md) · [Design System](./design.md) · [Engineering Rules](./rules.md) · [Task Plan](./tasks.md) · [Project Memory](./memory.md)
- **User Guides:** [Admin Guide](./docs/user-guide/admin-guide.md) · [Exhibitor Guide](./docs/user-guide/exhibitor-guide.md) · [Attendee Guide](./docs/user-guide/attendee-guide.md)
- **Developer Guide:** [Developer Guide](./docs/developer-guide/README.md)
- **Demo & Submission:** [Demo Video Script](./docs/demo/video-script.md) · [Submission Checklist](./docs/submission/submission-checklist.md)

## eProject Deliverables

| # | Deliverable | Status | Reference |
|---|-------------|--------|-----------|
| D1 | Working application | ✅ Complete | Local Client (`:5173`) & API (`:5000`) |
| D2 | Complete source code | ✅ Complete | [GitHub Repo](https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project) |
| D3 | Documentation | ✅ Complete | `/docs` + Root markdown specs |
| D4 | Demo video | ✅ Script Ready | [Demo Video Script](./docs/demo/video-script.md) |
| D5 | Test reports | ✅ 100% Passing | 510 Jest tests + 134 Vitest tests (644/644) |
| D6 | Submission package | ✅ Complete | [Submission Checklist](./docs/submission/submission-checklist.md) |
