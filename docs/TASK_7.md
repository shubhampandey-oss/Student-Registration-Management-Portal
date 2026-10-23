# Task 7 — Security Hardening, Rate Limiting, Input Sanitization & Performance Caching

## 1. Overview & Objectives
Task 7 initiates **Level 4** of the Cognifyz Technologies Full Stack Development Internship. This task hardens the application against real-world web vulnerabilities, implements multi-tiered rate limiting against brute-force and DDoS attacks, cleans user input against Cross-Site Scripting (XSS), and boosts query response times with in-memory caching and cache telemetry.

### Key Deliverables:
- **Helmet HTTP Security Headers**: Content Security Policy (CSP), clickjacking defense (`X-Frame-Options: SAMEORIGIN`), MIME-sniffing prevention (`X-Content-Type-Options: nosniff`), and server identity obfuscation (`X-Powered-By` hidden).
- **CORS Management**: Secure cross-origin resource sharing policy supporting credentials and restricted methods.
- **Multi-Tier Rate Limiting (`express-rate-limit`)**:
  - Global protection (250 req / 15m).
  - Strict authentication guard (10 attempts / 15m) protecting `/auth/login` and `/auth/register`.
  - API rate limiter (120 req / 15m) protecting `/api/*`.
- **Recursive XSS Input Sanitization**: Custom middleware stripping script tags, malicious event handlers (`onload`, `onerror`), and `javascript:` pseudo-protocols across `req.body`, `req.query`, and `req.params`.
- **In-Memory Caching Engine (`node-cache`)**: Response caching for `GET /api/v1/students` with automatic invalidation on write operations (`POST`, `PUT`, `DELETE`) and `X-Cache: HIT / MISS` telemetry headers.
- **Security & Diagnostics Dashboard (`/auth/security`)**: Real-time admin/authenticated view showing active security headers, cache telemetry (hits, misses, ratio, active keys), and manual cache flushing.
- **Automated Test Suite**: 9 new automated unit and integration tests in `tests/task7.test.js`, bringing the project total to **85 passing tests across 11 test suites (0 failures)**.

---

## 2. Security Hardening with Helmet

Configured in `src/middleware/security.middleware.js` and mounted globally in `src/app.js`:

```javascript
const helmetSecurity = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'sameorigin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
```

### Verified Headers:
- `X-Content-Type-Options: nosniff` — Prevents browsers from interpreting files as a different MIME type.
- `X-Frame-Options: SAMEORIGIN` — Blocks malicious sites from embedding the portal inside `<iframe>` tags to execute clickjacking attacks.
- `Content-Security-Policy` — Authorizes only trusted CDN origins (Bootstrap, Google Fonts) while restricting unauthorized script sources.
- `X-Powered-By` — Removed from all responses to prevent attackers from fingerprinting the Express framework.

---

## 3. Rate Limiting Strategy (`express-rate-limit`)

Located in `src/middleware/rateLimiter.middleware.js`:

| Limiter | Scope | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Global Limiter** | All routes (`/*`) | 15 minutes | 250 req | General DoS defense |
| **Auth Limiter** | `/auth/login`, `/auth/register` | 15 minutes | 10 req | Brute-force & credential stuffing defense |
| **API Limiter** | `/api/*` | 15 minutes | 120 req | API scraping & resource exhaustion defense |
| **Strict Test Limiter** | `/api/test-rate-limit` | 10 seconds | 2 req | Fast automated verification of HTTP `429` |

When a rate limit threshold is exceeded, the server returns **HTTP 429 Too Many Requests**:
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Global rate limit exceeded. Please wait a few minutes before trying again.",
  "code": 429
}
```

---

## 4. Input Sanitization & XSS Defense

Located in `src/middleware/sanitize.middleware.js`:
- Intercepts incoming requests immediately after body parsing.
- Recursively inspects every string in `req.body`, `req.query`, and `req.params`.
- Strips:
  - `<script>...</script>` and `<iframe>...</iframe>` tags.
  - Malicious inline event handlers: `onload=...`, `onerror=...`, `onclick=...`.
  - Pseudo-protocols: `javascript:...`.
- **Credential Protection**: Explicitly leaves password fields intact so password hashing and bcrypt comparison are never distorted.

---

## 5. In-Memory Caching & Telemetry (`node-cache`)

Located in `src/services/cache.service.js`:
- Standard TTL of 60 seconds with background sweeps every 120 seconds.
- Integrated into `GET /api/v1/students` via `cacheService.cacheMiddleware(60)`.

### Telemetry Headers:
- **`X-Cache: MISS`** — Response generated dynamically from the SQLite database and cached in memory.
- **`X-Cache: HIT`** — Response served directly from RAM in sub-millisecond time.

### Automated Invalidation:
Whenever student data is modified via:
- `POST /students/register` (Web Form)
- `POST /api/v1/students` (REST API)
- `PUT /api/v1/students/:id` (REST API)
- `DELETE /api/v1/students/:id` (REST API)

The server automatically calls `cacheService.invalidateStudentsCache()`, immediately purging stale cached query entries so subsequent queries return fresh data.

---

## 6. Security Diagnostics Dashboard (`/auth/security`)

An interactive system dashboard is accessible to authenticated users at [http://localhost:3000/auth/security](http://localhost:3000/auth/security):
- **Live Cache Metrics**: Hits, Misses, Hit Ratio percentage, and list of currently cached keys.
- **Security Matrix**: Detailed status of active Helmet headers, CORS policies, XSS sanitizers, and bcrypt settings.
- **Manual Cache Invalidation**: Includes a **Flush Cache** button to clear active RAM caches on demand.

---

## 7. Automated Test Suite (`tests/task7.test.js`)

Task 7 includes 9 comprehensive unit and integration tests executing on dedicated test port `3093`:
1. Helmet security headers enforcement (`nosniff`, `SAMEORIGIN`, CSP, hidden `X-Powered-By`).
2. CORS preflight and allowed origin header delivery.
3. Unit test for `sanitizeString` removing scripts and event handlers.
4. Integration test verifying `sanitizeInput` cleans POST request payloads.
5. Rate limit test verifying HTTP `429 Too Many Requests` when limits are exceeded.
6. Cache test verifying `X-Cache: MISS` on first query and `X-Cache: HIT` on second query.
7. Cache invalidation test verifying POST mutation purges cache.
8. Security dashboard route guard (unauthenticated requests redirect to login).
9. Security dashboard render test verifying live telemetry metrics for logged-in sessions.

### Full Test Suite Status:
- **85 tests passing across 11 test suites (0 failures).**

---

## 8. How to Run & Verify

```powershell
# Run Task 7 specific tests
node --test tests/task7.test.js

# Run full project test suite
npm test

# Start development server
npm run dev
```

Visit the following URLs:
- **Security Dashboard**: [http://localhost:3000/auth/security](http://localhost:3000/auth/security)
- **Cached API Endpoint**: [http://localhost:3000/api/v1/students](http://localhost:3000/api/v1/students)
- **API Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
