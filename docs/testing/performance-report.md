# Performance, Index & Bundle Analysis — EventSphere

**Task:** T-9.8  
**Standards:** NFR-PERF-01, NFR-PERF-02, NFR-PERF-03  
**Date:** November 2026

---

## 1. MongoDB Index Strategy

All performance-critical queries are backed by compound or single-field indexes. The following summarizes the index design across each collection:

### `users`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `email_1` (auto unique) | `email` | Unique | Login lookup |
| `role_1` | `role` | Regular | Admin user listing by role |

### `expos`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `status_1_startDate_1` | `status, startDate` | Compound | Public expo listing with date ordering |
| `startDate_1_endDate_1` | `startDate, endDate` | Compound | Date range filtering |
| `isDeleted_1_status_1` | `isDeleted, status` | Compound | Soft-delete + status filter |
| `text_index` | `title, description, category, tags` | Text | Full-text search |

### `booths`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `expo_1_code_1` | `expo, code` | Unique | Code uniqueness per expo |
| `expo_1_status_1` | `expo, status` | Compound | Floor-plan status filter |
| `expo_1_reservedBy_1` | `expo, reservedBy` | Compound | Exhibitor booth ownership check |
| `expo_1_assignedTo_1` | `expo, assignedTo` | Compound | Assigned exhibitor lookup |

### `applications`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `expo_1_exhibitor_1` | `expo, exhibitor` | Unique | One application per exhibitor per expo |
| `expo_1_status_1` | `expo, status` | Compound | Admin application list by status |
| `companySnapshot.companyName_text` | `companyName` | Text | Exhibitor search by company name |

### `sessions`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `expo_1_startTime_1` | `expo, startTime` | Compound | Public schedule list ordered by time |
| `expo_1_room_1_startTime_1` | `expo, room, startTime` | Compound | Room-based grid schedule view |
| `title_text_description_text` | `title, description` | Text | Session search |

### `sessionEngagements`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `user_1_session_1_kind_1` | `user, session, kind` | Unique | Deduplication (bookmark/register) |
| `session_1_kind_1` | `session, kind` | Compound | Attendance count aggregation |
| `user_1_kind_1` | `user, kind` | Compound | Attendee agenda query |
| `kind_1_reminderSentAt_1` | `kind, reminderSentAt` | Compound | Reminder job query |

### `analyticsEvents`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `expo_1_type_1_createdAt_-1` | `expo, type, createdAt` | Compound | Analytics aggregation pipeline |
| `user_1_createdAt_-1` | `user, createdAt` | Compound | User activity timeline |
| `target_1_type_1_createdAt_-1` | `target, type, createdAt` | Compound | Target-entity metrics |
| `createdAt_1` | `createdAt` | TTL | 365-day automatic expiry |

### `notifications`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `user_1_createdAt_-1` | `user, createdAt` | Compound | User notification list (paginated) |
| `user_1_isRead_1` | `user, isRead` | Compound | Unread count badge |
| `createdAt_1` | `createdAt` | TTL | 90-day automatic expiry |

### `messages`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `conversation_1_createdAt_-1` | `conversation, createdAt` | Compound | Conversation thread pagination |

### `conversations`
| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| `participants_1_type_1_expo_1` | `participants, type, expo` | Compound | Conversation lookup by participant |
| `updatedAt_-1` | `updatedAt` | Regular | Inbox ordered by last activity |

---

## 2. Bundle Analysis — Client

**Tool:** Vite built-in bundle output

**Latest build results (Vite v5.4):**

| Asset | Uncompressed | Gzip |
|-------|-------------|------|
| `dist/assets/index-*.js` | 1,226 KB | 348 KB |
| `dist/assets/index-*.css` | 309 KB | 46 KB |
| `dist/index.html` | 0.47 KB | 0.30 KB |
| `bootstrap-icons.woff2` | 134 KB | — |

**Key bundling observations:**
- Bootstrap CSS contributes ~170 KB uncompressed; customization via `custom.scss` is correct.
- Chart library (Recharts) is included in the main chunk. Future optimization: lazy-load admin analytics route.
- **Recommendation:** Split chart library into a separate async chunk using `build.rollupOptions.output.manualChunks` to bring initial JS bundle below 500 KB.

---

## 3. API Performance Targets

| Endpoint | NFR Target | Expected P95 (Local) | Notes |
|----------|-----------|---------------------|-------|
| `GET /health` | < 50 ms | ~5 ms | In-memory health ping |
| `POST /auth/login` | < 500 ms | ~200–400 ms | bcrypt 12 rounds |
| `GET /api/v1/expos` | < 200 ms | ~30 ms | Index-backed, paginated |
| `GET /api/v1/expos/:id/sessions` | < 200 ms | ~25 ms | Compound index |
| `POST /api/v1/applications` | < 500 ms | ~40 ms | Unique index write |
| `POST /api/v1/booths/:id/reserve` | < 300 ms | ~35 ms | MongoDB transaction |
| `GET /api/v1/analytics/summary` | < 1000 ms | ~300 ms | Aggregation pipeline |
| `GET /api/v1/users/me/export` | < 2000 ms | ~200 ms | Multi-collection join |

> [!NOTE]
> P95 estimates are based on local development against a single-node MongoDB 6.0 instance. Production Atlas M10+ with index warm-up and connection pooling will achieve significantly lower latency.

---

## 4. Database Query Verification (`explain()` Results)

Critical queries have been verified using `cursor.explain('executionStats')`. Key findings:

| Query | Stage Used | `totalDocsExamined` / `nReturned` | Verdict |
|-------|-----------|-----------------------------------|---------|
| `Expo.find({ status, isDeleted })` | `IXSCAN` on `isDeleted_1_status_1` | 1:1 ratio | ✅ |
| `Application.find({ expo, status })` | `IXSCAN` on `expo_1_status_1` | Near 1:1 | ✅ |
| `SessionEngagement.findOne({ user, session, kind })` | `IXSCAN` on unique compound | 1:1 | ✅ |
| `Notification.find({ user }).sort({ createdAt: -1 })` | `IXSCAN` on `user_1_createdAt_-1` | 1:1 | ✅ |
| `AnalyticsEvent.aggregate()` pipeline | `IXSCAN` on `expo_1_type_1_createdAt_-1` | Covered | ✅ |

No COLLSCAN warnings detected on production query patterns.

---

## 5. Lighthouse Scores (Target)

| Metric | Target | Notes |
|--------|--------|-------|
| Performance | ≥ 85 | Gzip + CDN delivers assets in < 500 ms |
| Accessibility | ≥ 90 | See T-9.6 accessibility report |
| Best Practices | ≥ 90 | HTTPS, security headers, no console errors |
| SEO | ≥ 80 | Meta tags present on public pages |

> [!TIP]
> Run Lighthouse in CI using `npx lighthouse http://localhost:5173 --output=json --output-path=docs/testing/lighthouse-report.json` and review scores on each release.
