# Backup & Restore Drill — EventSphere

**Task:** T-9.9  
**Standards:** NFR-REL-01, NFR-REL-02, NFR-OPS-01  
**Date:** November 2026

---

## Overview

EventSphere uses MongoDB as its primary database. This document records the backup strategy, the runbook for restore drills, and verification steps.

> [!IMPORTANT]
> Run restore drills on a **staging** database, not production, unless a data recovery incident has occurred. Always verify the restored dataset before switching production traffic.

---

## 1. Backup Strategy

| Property | Value |
|---|---|
| **Tool** | `mongodump` (MongoDB official tool) |
| **Format** | BSON archive + gzip (`.tar.gz`) |
| **Frequency** | Daily (scheduled via cron or CI/CD pipeline) |
| **Retention** | 30 days (prune archives older than 30 days) |
| **Storage** | Local (`./backups/`) or remote object storage (S3-compatible) |

---

## 2. Creating a Backup

```bash
# Using the project backup script
node server/scripts/backup.js

# Or directly with mongodump
mongodump --uri="$MONGO_URI" \
  --archive="backups/eventsphere-$(date +%Y-%m-%d-%H-%M).tar.gz" \
  --gzip
```

Expected output:
```
[backup] Starting MongoDB dump → backups/eventsphere-2026-11-09-16-30.tar.gz
[backup] ✅ Backup completed: backups/eventsphere-2026-11-09-16-30.tar.gz
```

---

## 3. Restore Drill — Step-by-Step Runbook

### Pre-restore Checklist

- [ ] Identify the backup archive to restore from (`backups/` or object storage).
- [ ] Confirm target MongoDB URI (`MONGO_URI`) points to staging, not production.
- [ ] Notify the team about the restore window (staging downtime expected).

### Step 1: Stop Application Servers

```bash
# Stop API server and worker processes (send SIGTERM for graceful shutdown)
kill -SIGTERM $(lsof -ti:3000)
# Or if using docker-compose:
docker-compose stop api
```

### Step 2: Run Restore

```bash
# Using the project restore script (with --drop to clear existing data first)
node server/scripts/restore.js backups/eventsphere-2026-11-09-16-30.tar.gz --drop

# Or directly with mongorestore
mongorestore \
  --uri="$MONGO_URI" \
  --archive="backups/eventsphere-2026-11-09-16-30.tar.gz" \
  --gzip \
  --drop
```

### Step 3: Verify Restored Data

```bash
# Connect to MongoDB and verify document counts
mongosh "$MONGO_URI" --eval "
  db = db.getSiblingDB('eventsphere');
  print('users:',    db.users.countDocuments());
  print('expos:',    db.expos.countDocuments());
  print('sessions:', db.sessions.countDocuments());
  print('booths:',   db.booths.countDocuments());
"
```

### Step 4: Restart Application and Smoke Test

```bash
# Start server
npm run dev:server

# Health check
curl http://localhost:3000/health
# Expected: { "status": "ok", "db": "connected" }

# Metrics check
curl http://localhost:3000/metrics
# Expected: { "db_connected": true, "uptime_seconds": ... }
```

### Step 5: Mark Drill as Complete

Record the drill results in the table below.

---

## 4. Restore Drill Log

| Date | Archive | Environment | Operator | Collections Verified | Result |
|------|---------|-------------|----------|----------------------|--------|
| 2026-11-09 | eventsphere-2026-11-09-* | Staging | (developer) | users, expos, sessions, booths | ✅ Pass |

---

## 5. Graceful Shutdown Verification

The API server handles `SIGTERM` and `SIGINT` signals via [`server/src/server.js`](../server/src/server.js):

1. `SIGTERM` received → `isShuttingDown = true`
2. Background cron jobs stopped (`stopAllJobs()`)
3. `httpServer.close()` — waits for in-flight requests to complete
4. `disconnectDb()` — cleanly closes all MongoDB connections
5. `process.exit(0)` — clean exit
6. Force-exit timeout: 10 seconds if shutdown stalls

**Verification test:**
```bash
# Start server, then immediately send SIGTERM
node server/src/server.js &
SERVER_PID=$!
sleep 2
kill -SIGTERM $SERVER_PID
# Expected log: "Shutting down…" → "Server closed cleanly"
```

---

## 6. `/metrics` Endpoint

The API exposes a metrics endpoint at `GET /metrics` for operational monitoring:

```json
{
  "success": true,
  "data": {
    "uptime_seconds": 3600,
    "db_connected": true,
    "memory": {
      "rss_mb": "128.42",
      "heap_used_mb": "72.15",
      "heap_total_mb": "95.00",
      "external_mb": "4.21"
    },
    "nodejs_version": "v20.18.0",
    "platform": "linux",
    "pid": 12345,
    "timestamp": "2026-11-09T16:30:00.000Z"
  }
}
```

> [!TIP]
> In production, protect `/metrics` behind a network policy, internal VPN, or API gateway token to prevent external enumeration of system state.
