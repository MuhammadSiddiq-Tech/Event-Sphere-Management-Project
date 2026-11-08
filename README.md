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
# Creates: admin@eventsphere.test / exhibitor@eventsphere.test / attendee@eventsphere.test
# See server/seed/README.md for credentials
```

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

- [Architecture](./architecture.md)
- [Product Requirements](./prd.md)
- [Design System](./design.md)
- [Engineering Rules](./rules.md)
- [Task Plan](./tasks.md)
- [Project Memory](./memory.md)

## eProject Deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| D1 | Working application | 🔄 In progress |
| D2 | Complete source code | 🔄 In progress |
| D3 | Documentation | 🔄 In progress |
| D4 | Demo video | ⬜ Pending |
| D5 | Test reports | ⬜ Pending |
| D6 | Submission package | ⬜ Pending |
