# Level 4 Summary: Advanced Security, Caching, and Production Automation

## Tasks in this Level
- [Task 7 — Security Hardening, Rate Limiting, Input Sanitization & Performance Caching](../TASK_7.md) ✅
- [Task 8 — Automated Background Tasks (Node-Cron), Production Bundling & Final Internship Deployment Package](../../docs/TASK_8.md) (Upcoming)

---

## What Level 4 Covers
Level 4 equips the Student Registration and Management Portal with industrial-strength security hardening, multi-tiered DDoS and brute-force defenses, low-latency caching, and automated background jobs:

1. **HTTP Security Headers (Helmet)**: Enforcing Content Security Policy (CSP), clickjacking defenses (`X-Frame-Options: SAMEORIGIN`), MIME-sniffing prevention (`X-Content-Type-Options: nosniff`), and server header obfuscation.
2. **CORS Governance**: Configurable cross-origin resource sharing for secure external API consumption.
3. **Multi-Tier Rate Limiting (`express-rate-limit`)**:
   - Global rate limiter (250 req / 15m) preventing DoS.
   - Strict authentication limiter (10 attempts / 15m) preventing credential stuffing.
   - API rate limiter (120 req / 15m) protecting endpoints from scraping.
4. **Recursive XSS Defense Middleware**: Sanitizes incoming user payloads across `req.body`, `req.query`, and `req.params`, eliminating malicious script tags and event handlers while preserving credentials.
5. **In-Memory Caching Engine (`node-cache`)**: Micro-caching frequent student queries with automatic invalidation on mutations (`POST`, `PUT`, `DELETE`) and transparent `X-Cache: HIT / MISS` telemetry.
6. **Live Security Diagnostics Dashboard**: Real-time observability interface at `/auth/security` tracking cache hit ratios, active keys, and enforced security standards.

---

## Running Level 4
```powershell
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"
npm test
npm run dev
```

- Portal: http://localhost:3000
- Security Diagnostics: http://localhost:3000/auth/security
- REST API with Caching: http://localhost:3000/api/v1/students
