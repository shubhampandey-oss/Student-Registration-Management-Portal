'use strict';

/**
 * tests/task7.test.js
 * Automated test suite for Task 7 — Security Hardening, Rate Limiting & Performance Caching.
 * Tests Helmet headers, CORS policies, XSS input sanitization,
 * rate limit thresholds (HTTP 429), in-memory cache HIT/MISS headers,
 * and cache invalidation on write operations.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// Use isolated test port
process.env.PORT = '3093';
process.env.NODE_ENV = 'test';

const { app, server } = require('../src/app');
const dbManager       = require('../src/models/db');
const cacheService    = require('../src/services/cache.service');
const { sanitizeString } = require('../src/middleware/sanitize.middleware');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3093,
      ...options,
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function parseCookies(res) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

describe('Task 7 — Security Hardening, Rate Limiting & Performance Caching', () => {

  before(async () => {
    await dbManager.ensureDbReady();
    cacheService.flush();
  });

  after(() => {
    cacheService.flush();
    if (server && server.close) {
      server.close();
    }
  });

  // ── Helmet HTTP Security Headers ───────────────────────────
  it('enforces secure HTTP headers via Helmet', async () => {
    const res = await request({ method: 'GET', path: '/' });
    assert.equal(res.statusCode, 200);

    // nosniff prevents MIME-type sniffing
    assert.equal(res.headers['x-content-type-options'], 'nosniff');

    // SAMEORIGIN prevents clickjacking framing
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');

    // CSP restricts scripts and styles
    assert.ok(res.headers['content-security-policy'], 'Content-Security-Policy header must be present');

    // X-Powered-By is concealed to prevent tech stack fingerprinting
    assert.equal(res.headers['x-powered-by'], undefined, 'X-Powered-By must not be exposed');
  });

  // ── CORS Policy ───────────────────────────────────────────
  it('configures CORS headers on preflight/standard requests', async () => {
    const res = await request({
      method: 'OPTIONS',
      path: '/api/v1/students',
      headers: {
        'Origin': 'http://localhost:3093',
        'Access-Control-Request-Method': 'GET',
      },
    });

    assert.ok(res.statusCode === 204 || res.statusCode === 200, 'Preflight should succeed');
    assert.ok(res.headers['access-control-allow-origin'], 'Access-Control-Allow-Origin header must be returned');
  });

  // ── XSS Input Sanitization ─────────────────────────────────
  it('sanitizeString strips dangerous script tags and event handlers', () => {
    const malicious = '<script>alert("XSS")</script>Hello <img src="x" onerror="stealCookies()">World!';
    const cleaned = sanitizeString(malicious);

    assert.ok(!cleaned.includes('<script>'), 'Must strip <script> tag');
    assert.ok(!cleaned.includes('onerror'), 'Must strip onerror handler');
    assert.ok(cleaned.includes('Hello'), 'Must preserve safe text');
    assert.ok(cleaned.includes('World!'), 'Must preserve safe text');
  });

  it('sanitizeInput middleware sanitizes incoming POST requests', async () => {
    const payload = JSON.stringify({
      name: 'Jane Doe <script>bad()</script>',
      email: `safe_${Date.now()}@example.com`,
      phone: '9876543210',
      course: 'Computer Science',
      dob: '2001-05-15',
      gender: 'Female',
      year: '3rd Year',
      message: 'Interested in AI <iframe src="evil.com"></iframe>.',
    });

    const res = await request({
      method: 'POST',
      path: '/api/v1/students',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 201);
    const json = JSON.parse(res.body);
    assert.ok(!json.data.name.includes('<script>'), 'Student name must be sanitized');
    assert.ok(!json.data.message.includes('<iframe>'), 'Student message must be sanitized');
  });

  // ── Rate Limiting (HTTP 429) ───────────────────────────────
  it('triggers HTTP 429 Too Many Requests when rate threshold is exceeded', async () => {
    // Request 1 — OK
    const res1 = await request({ method: 'GET', path: '/api/test-rate-limit' });
    assert.equal(res1.statusCode, 200);

    // Request 2 — OK
    const res2 = await request({ method: 'GET', path: '/api/test-rate-limit' });
    assert.equal(res2.statusCode, 200);

    // Request 3 — Exceeds limit (max: 2) -> 429 Too Many Requests
    const res3 = await request({ method: 'GET', path: '/api/test-rate-limit' });
    assert.equal(res3.statusCode, 429);
    assert.ok(res3.body.includes('Rate Limit Exceeded') || res3.body.includes('Too Many Requests'));
  });

  // ── In-Memory Caching (node-cache) & Invalidation ───────────
  it('GET /api/v1/students returns X-Cache: MISS on first request, X-Cache: HIT on second', async () => {
    cacheService.flush();

    // 1st request -> Cache MISS
    const res1 = await request({ method: 'GET', path: '/api/v1/students' });
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.headers['x-cache'], 'MISS');

    // 2nd request -> Cache HIT
    const res2 = await request({ method: 'GET', path: '/api/v1/students' });
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.headers['x-cache'], 'HIT');
  });

  it('creating a new student automatically invalidates the cache', async () => {
    // Prime the cache
    await request({ method: 'GET', path: '/api/v1/students' });
    const cachedRes = await request({ method: 'GET', path: '/api/v1/students' });
    assert.equal(cachedRes.headers['x-cache'], 'HIT', 'Cache should be primed and return HIT');

    // Mutate state with POST
    const payload = JSON.stringify({
      name: 'Cache Invalidation Test',
      email: `cache_${Date.now()}@example.com`,
      phone: '9876543210',
      course: 'Cybersecurity',
      dob: '2002-04-10',
      gender: 'Male',
      year: '2nd Year',
    });

    const createRes = await request({
      method: 'POST',
      path: '/api/v1/students',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);
    assert.equal(createRes.statusCode, 201);

    // Next GET must be a Cache MISS because the write purged student cache keys
    const freshRes = await request({ method: 'GET', path: '/api/v1/students' });
    assert.equal(freshRes.statusCode, 200);
    assert.equal(freshRes.headers['x-cache'], 'MISS', 'Cache must be invalidated after POST mutation');
  });

  // ── Security & Diagnostics View ────────────────────────────
  it('GET /auth/security redirects unauthenticated requests to login', async () => {
    const res = await request({ method: 'GET', path: '/auth/security' });
    assert.equal(res.statusCode, 302);
    assert.ok(res.headers.location.startsWith('/auth/login'));
  });

  it('GET /auth/security renders 200 and displays cache analytics for logged-in user', async () => {
    // Login as admin
    const loginPayload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      password: 'Admin@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);

    const sessionCookie = parseCookies(loginRes);

    const secRes = await request({
      method: 'GET',
      path: '/auth/security',
      headers: { 'Cookie': sessionCookie },
    });

    assert.equal(secRes.statusCode, 200);
    assert.ok(secRes.body.includes('Security &amp; System Diagnostics') || secRes.body.includes('Security & System Diagnostics'));
    assert.ok(secRes.body.includes('node-cache'), 'Should mention node-cache engine');
    assert.ok(secRes.body.includes('Helmet'), 'Should mention Helmet security');
  });

});
