# Task 8 — Automated Background Tasks, Production Health & Final Internship Package

## 1. Overview & Objectives
Task 8 is the culmination of **Level 4** and marks the successful completion of all requirements for the **Cognifyz Technologies Full Stack Development Internship**. This task establishes enterprise-grade operational resilience through **automated background jobs (`node-cron`)**, **scheduled SQLite database backups with rolling rotation**, **system health telemetry APIs**, and **CLI tooling**.

### Key Deliverables:
- **Automated Background Tasks (`node-cron`)**: Scheduled background runners executing scheduled database snapshots and cache maintenance sweeps without blocking HTTP request handling.
- **Automated Database Backup Engine**: Generates binary snapshots of the active SQLite database to `data/backups/backup_<timestamp>.sqlite`.
- **Rolling Backup Rotation**: Automatic pruning policy enforcing a maximum of 5 recent backups to conserve disk space.
- **System Health & Observability API (`GET /api/v1/health`)**: Public JSON endpoint exposing system uptime, memory allocation (heap used/total, RSS), database records, and backup statistics.
- **Backup Management Endpoints**:
  - `GET /api/v1/cron/backups` — Lists all available backup archives with file sizes and creation timestamps.
  - `POST /api/v1/cron/backup` — On-demand programmatic backup trigger (`201 Created`).
- **Manual CLI Backup Script**: Executable via `npm run backup` (`scripts/backup.js`).
- **Automated Test Suite**: 8 automated unit and integration tests in `tests/task8.test.js`, elevating the full portal test suite to **93 passing tests across 12 test suites (0 failures)**.

---

## 2. Background Task Architecture (`node-cron`)

Located in `src/services/cron.service.js` and initialized on server startup in `src/app.js`:

```javascript
// Nightly Database Backup (Runs at 02:00 AM daily)
cron.schedule('0 2 * * *', () => {
  const result = runDatabaseBackup();
  console.log(`[CRON] Nightly SQLite backup completed: ${result.filename}`);
});

// Hourly Cache Hygiene Sweep (Runs at minute 0 of every hour)
cron.schedule('0 * * * *', () => {
  const result = runCacheHygiene();
  console.log(`[CRON] Hourly cache hygiene check: ${result.activeKeys} keys active`);
});
```

*Note: In test mode (`NODE_ENV === 'test'`), background recurring timers are automatically bypassed to avoid hanging open handles in Node's test runner, while all cron worker functions remain 100% testable via unit and API integration tests.*

---

## 3. Database Backup & Rolling Rotation Policy

When a backup executes (automatically via cron, via API, or via CLI):
1. **Binary Export**: The in-memory/disk SQLite state is extracted into a binary buffer via `dbManager.getDb().export()`.
2. **Timestamped Persistence**: Saved to `data/backups/backup_<YYYY-MM-DDTHH-mm-ss-sssZ>.sqlite`.
3. **Rotation Pruning**: The backup directory is scanned; if total backups exceed `MAX_BACKUPS = 5`, older backups are safely unlinked, preserving only the 5 most recent snapshots.

### CLI Backup Execution
Developers or server operators can create immediate manual database snapshots at any time:
```powershell
npm run backup
```

Output:
```text
🔄 Initializing database for backup...
💾 Running SQLite database backup...

✅ Database Backup Successful!
   Filename      : backup_2026-10-23T16-05-29-996Z.sqlite
   Path          : C:\Users\shubh\OneDrive\Desktop\Cognifyz\data\backups\backup_2026-10-23T16-05-29-996Z.sqlite
   Size          : 24.00 KB
   Total Backups : 1
   Timestamp     : 2026-10-23T16:05:29.999Z
```

---

## 4. System Health & Telemetry API (`GET /api/v1/health`)

Provides an industry-standard health check for container orchestrators (Docker, Kubernetes) and uptime monitors:

### Sample JSON Response:
```json
{
  "status": "UP",
  "telemetry": {
    "status": "HEALTHY",
    "uptimeSeconds": 1420,
    "nodeVersion": "v24.14.1",
    "memory": {
      "rssMB": "54.2",
      "heapUsedMB": "22.8",
      "heapTotalMB": "38.5"
    },
    "database": {
      "engine": "SQLite (sql.js / WebAssembly)",
      "sizeBytes": 24576,
      "studentsCount": 4,
      "usersCount": 2
    },
    "backups": {
      "count": 2,
      "latest": {
        "filename": "backup_2026-10-23T16-05-29-996Z.sqlite",
        "sizeBytes": 24576,
        "createdAt": "2026-10-23T16:05:29.999Z"
      }
    },
    "timestamp": "2026-10-23T16:08:45.120Z"
  },
  "timestamp": "2026-10-23T16:08:45.122Z"
}
```

---

## 5. Automated Test Suite (`tests/task8.test.js`)

Task 8 is covered by 8 automated unit and integration tests executing on dedicated test port `3092`:
1. `GET /api/v1/health` returns HTTP 200 with complete telemetry payload.
2. `cronService.runDatabaseBackup()` generates valid `.sqlite` snapshot on disk.
3. `cronService.listBackups()` returns sorted backup objects with size and timestamps.
4. `cronService` enforces `MAX_BACKUPS = 5` rotation policy.
5. `GET /api/v1/cron/backups` returns JSON registry of backups.
6. `POST /api/v1/cron/backup` triggers on-demand backup returning HTTP 201 Created.
7. `cronService.runCacheHygiene()` evaluates cache telemetry.
8. `cronService.getSystemMetrics()` aggregates complete system telemetry.

### Full Test Suite Status:
- **93 tests passing across 12 test suites (0 failures).**

---

## 6. How to Run & Verify

```powershell
# Run Task 8 tests
node --test tests/task8.test.js

# Run full project test suite
npm test

# Trigger manual database backup
npm run backup

# Start development server
npm run dev
```

Key Endpoints:
- **Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Backup Registry**: [http://localhost:3000/api/v1/cron/backups](http://localhost:3000/api/v1/cron/backups)
- **Security & Diagnostics**: [http://localhost:3000/auth/security](http://localhost:3000/auth/security)
- **API Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Student Portal**: [http://localhost:3000](http://localhost:3000)
