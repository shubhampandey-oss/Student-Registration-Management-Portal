# Level 4 Summary: Advanced Security, Caching, and Production Automation

## Tasks in this Level
- [Task 7 — Security Hardening, Rate Limiting, Input Sanitization & Performance Caching](../TASK_7.md) ✅
- [Task 8 — Automated Background Tasks (Node-Cron), Production Bundling & Final Internship Deployment Package](../TASK_8.md) ✅

---

## What Level 4 Covers
Level 4 provides the production-grade reliability, security hardening, automated operations, and health telemetry expected in commercial software:

1. **HTTP Security Headers (Helmet) (Task 7)**: Content Security Policy (CSP), clickjacking defenses (`X-Frame-Options: SAMEORIGIN`), MIME-sniffing prevention (`X-Content-Type-Options: nosniff`), and server header obfuscation.
2. **Multi-Tier Rate Limiting (Task 7)**: `express-rate-limit` defending against global DoS, authentication credential-stuffing, and API scraping.
3. **Recursive XSS Defense (Task 7)**: Deep sanitization across `req.body`, `req.query`, and `req.params` while preserving credentials.
4. **In-Memory Caching Engine (Task 7)**: `node-cache` integration with `X-Cache: HIT / MISS` telemetry and automatic invalidation on student mutations (`POST`, `PUT`, `DELETE`).
5. **Live Diagnostics Portal (Task 7)**: Interactive telemetry dashboard at `/auth/security`.
6. **Automated Background Tasks (Node-Cron) (Task 8)**: Scheduled cron jobs executing nightly SQLite database backups and hourly cache hygiene sweeps.
7. **Automated Backup Rotation (Task 8)**: Rolling rotation policy preserving the latest 5 backups in `data/backups/`.
8. **System Health & Telemetry API (Task 8)**: `/api/v1/health` providing live telemetry (memory RSS/heap, database metrics, uptime, node version).
9. **On-Demand Backup Script (Task 8)**: `npm run backup` CLI runner for immediate manual database snapshots.

---

## Running Level 4
```powershell
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"
npm test
npm run backup
npm run dev
```

### Key URLs:
- Web Portal: [http://localhost:3000](http://localhost:3000)
- Security & Cache Diagnostics: [http://localhost:3000/auth/security](http://localhost:3000/auth/security)
- Health API: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Backups API: [http://localhost:3000/api/v1/cron/backups](http://localhost:3000/api/v1/cron/backups)
- REST Documentation: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
