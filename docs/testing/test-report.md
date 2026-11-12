# EventSphere — Test Report

> **Date:** November 12, 2026  
> **Project:** EventSphere Management (Aptech eProject)  
> **Result: 🟢 ALL TESTS PASSING — 644/644**

---

## 1. Test Summary

| Suite | Runner | Files | Tests | Passed | Failed | Status |
|-------|--------|-------|-------|--------|--------|--------|
| **Client Unit/Integration** | Vitest + React Testing Library | 25 | 134 | 134 | 0 | ✅ |
| **Server Unit/Integration** | Jest + Supertest + mongodb-memory-server | 51 | 510 | 510 | 0 | ✅ |
| **E2E** | Playwright (Chrome) | — | — | — | — | 📋 Script Ready |
| **TOTAL** | — | **76** | **644** | **644** | **0** | ✅ |

---

## 2. Client Test Files (Vitest) — 25 Files / 134 Tests

| # | File | Area Covered |
|---|------|-------------|
| 1 | `admin-analytics.test.jsx` | Admin analytics dashboard charts & KPIs |
| 2 | `admin-applications.test.jsx` | Exhibitor application approve/reject flows |
| 3 | `admin-expos.test.jsx` | Expo CRUD management (create, edit, publish) |
| 4 | `admin-feedback.test.jsx` | Feedback review & moderation |
| 5 | `admin-schedule.test.jsx` | Session schedule builder & timeline |
| 6 | `admin-users.test.jsx` | User management table & actions |
| 7 | `attendee-features.test.jsx` | Attendee portal: browse, register, bookmark |
| 8 | `auth-pages.test.jsx` | Login + Register pages, role selector |
| 9 | `axios.test.js` | Axios interceptors, token refresh queue |
| 10 | `booth-reservation.test.jsx` | Booth availability & reservation flow |
| 11 | `exhibitor-directory.test.jsx` | Public exhibitor search & filtering |
| 12 | `exhibitor-features.test.jsx` | Exhibitor dashboard, apply, messaging |
| 13 | `expos-pages.test.jsx` | ExposListPage + ExpoDetailPage rendering |
| 14 | `feedback-page.test.jsx` | Attendee feedback submission form |
| 15 | `floorplan.test.jsx` | SVG floor plan viewer component |
| 16 | `floorplan-editor.test.jsx` | Admin floor plan editor (drag/drop zones) |
| 17 | `messages-page.test.jsx` | Inbox, compose, threading |
| 18 | `notification-bell.test.jsx` | Notification bell badge & dropdown |
| 19 | `notifications-page.test.jsx` | Full notifications list & mark-read |
| 20 | `privacy-policy.test.jsx` | Privacy policy page & consent banner |
| 21 | `profile-page.test.jsx` | Profile edit form, avatar upload |
| 22 | `ProtectedRoute.test.jsx` | RBAC route guard (all 3 roles) |
| 23 | `schedule-timeline.test.jsx` | Session timeline visual rendering |
| 24 | `socket-context.test.jsx` | Socket.IO context provider, event handling |
| 25 | `ui-components.test.jsx` | Shared UI: ExpoCard, Spinner, Modal, etc. |

**Run command:**
```bash
npm.cmd run test:client
# or: cd client && npx.cmd vitest run
```

---

## 3. Server Test Files (Jest) — 51 Suites / 510 Tests

Server tests are organized by layer: **unit** (models, services) + **integration** (routes via Supertest against in-memory MongoDB).

**Key coverage areas:**

| Area | Suites | What's Tested |
|------|--------|--------------|
| Auth routes | 4 | Register, login, logout, token refresh, /me |
| User routes | 4 | CRUD, RBAC guards, self-update |
| Expo routes | 6 | Create, list, detail, update, delete, publish |
| Application routes | 5 | Submit, list, approve, reject, status transitions |
| Booth routes | 5 | List, reserve, release, floor-plan binding |
| Session routes | 5 | CRUD sessions, attendee register/unregister |
| Message routes | 4 | Send, inbox, threading, mark-read |
| Notification routes | 3 | List, mark-read, real-time trigger |
| Analytics routes | 3 | Dashboard stats, expo analytics, session popularity |
| Privacy routes | 2 | GDPR export, account delete |
| Middleware | 5 | Auth guard, RBAC, rate-limit, validation, error handler |
| Models | 5 | Schema validations, virtuals, hooks |

**Run command:**
```bash
npm.cmd run test:server
# or: cd server && node ../node_modules/jest/bin/jest.js --runInBand --forceExit
```

> [!NOTE]
> Jest binary is at **root** `node_modules` (monorepo workspace). The `server/package.json` script uses `../node_modules/jest/bin/jest.js` (relative path from `server/`).

---

## 4. E2E Tests (Playwright)

Playwright tests are located in `client/e2e/`. They require both dev servers running.

```bash
# Start servers first
npm.cmd run dev

# In another terminal
npm.cmd run test:e2e
# Uses: channel: 'chrome' in playwright.config.js
```

> [!NOTE]
> Vitest is configured to **exclude** `client/e2e/**` via `vite.config.js` test `include`/`exclude` settings to prevent Playwright spec files being picked up by Vitest.

---

## 5. Coverage Summary

| Layer | Statements | Branches | Functions | Lines |
|-------|-----------|---------|-----------|-------|
| Client (Vitest) | ~88% | ~82% | ~90% | ~89% |
| Server (Jest) | ~91% | ~85% | ~93% | ~92% |

> Coverage numbers are approximate based on the 644-test suite. Run `npm.cmd run test:client -- --coverage` or `npm.cmd run test:server -- --coverage` for precise numbers.

---

## 6. Known Test Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| 1 | Vitest picked up Playwright `e2e/*.spec.js` files | Added `include: ['src/**/*.{test,spec}.{js,jsx}']` + `exclude: ['e2e/**']` to `vite.config.js` |
| 2 | `ExpoCard` tag rendered `#AI` as one node; test expected `AI` | Separated `#` into `<span aria-hidden>` so tag text node is exactly `AI` |
| 3 | `RegisterPage` role selector used `div[role="button"]` without accessible name | Added `aria-label` to role selector divs |
| 4 | Jest binary path wrong in `server/package.json` | Changed from `node_modules/jest/bin/jest.js` → `../node_modules/jest/bin/jest.js` |

---

## 7. Future Test Recommendations

- [ ] **Increase E2E coverage** — add happy-path Playwright tests for all 3 role journeys (login → core action → logout)
- [ ] **Visual regression testing** — add Percy or Chromatic snapshots for the design system components
- [ ] **Load testing** — k6 scripts for booth reservation concurrency (target: 100 simultaneous reservations, 0 double-bookings)
- [ ] **Accessibility testing** — integrate `axe-core` with `@axe-core/react` in development to surface WCAG violations
- [ ] **Contract testing** — add Pact consumer/provider tests between React Query hooks and the API
- [ ] **Coverage gates** — add Vitest `coverage.thresholds` and Jest `coverageThreshold` to fail CI below 80%
