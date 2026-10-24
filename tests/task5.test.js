/**
 * tests/task5.test.js
 * Automated tests for Task 5 using Node.js built-in test runner.
 *
 * Run with: node --test tests/task5.test.js
 *
 * Tests cover:
 *  - Interactive API Documentation view (GET /api/docs)
 *  - REST API endpoint: GET /api/v1/students (list, meta, pagination)
 *  - REST API endpoint: POST /api/v1/students (create via JSON, 201 Created)
 *  - REST API validation failure (422 Unprocessable Entity)
 *  - REST API endpoint: GET /api/v1/students/:id (retrieve single student)
 *  - REST API endpoint: PUT /api/v1/students/:id (update student, 200 OK)
 *  - REST API endpoint: DELETE /api/v1/students/:id (delete student, 200 OK)
 *  - REST API 404 handling for non-existent IDs and routes
 *  - Security verification: passwordHash is NEVER exposed in API responses
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

process.env.NODE_ENV = 'test';
process.env.PORT     = '3095';

const { app, server } = require('../src/app');

const BASE = 'http://localhost:3095';

function apiRequest(method, path, bodyData = null) {
  return new Promise((resolve, reject) => {
    const payload = bodyData ? JSON.stringify(bodyData) : null;
    const options = {
      hostname: 'localhost',
      port: 3095,
      path,
      method,
      headers: {
        'Accept': 'application/json',
      },
    };

    if (payload) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, body: data, json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Task 5 — RESTful API & Front-End Integration', () => {

  let createdStudentId = null;

  before(async () => {
    await new Promise(r => setTimeout(r, 200));
  });

  after(() => {
    server.close();
  });

  // ── 1. API Documentation View ─────────────────────────────────
  test('GET /api/docs — renders interactive API explorer', async () => {
    const res = await apiRequest('GET', '/api/docs');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('RESTful API Documentation'), 'Must include documentation header');
    assert.ok(res.body.includes('apiEndpointInput'), 'Must include interactive endpoint input');
    assert.ok(res.body.includes('sendApiRequestBtn'), 'Must include send request button');
  });

  // ── 2. Create student via JSON POST ───────────────────────────
  test('POST /api/v1/students — creates student and returns 201 Created', async () => {
    const res = await apiRequest('POST', '/api/v1/students', {
      name:     'API Test Student',
      email:    'api.student@example.com',
      course:   'Information Technology',
      year:     '3rd Year',
      phone:    '+91 98765 43210',
      password: 'Secret@Api2026',
    });

    assert.equal(res.status, 201, 'Should return HTTP 201 Created');
    assert.ok(res.json, 'Response must be valid JSON');
    assert.equal(res.json.success, true);
    assert.ok(res.json.data, 'Must return created student data object');
    assert.equal(res.json.data.name, 'API Test Student');
    assert.equal(res.json.data.email, 'api.student@example.com');

    // Security Check: passwordHash MUST NOT be exposed
    assert.equal(res.json.data.passwordHash, undefined, 'passwordHash must never be exposed');
    assert.equal(res.json.data.password, undefined, 'plaintext password must never be exposed');

    createdStudentId = res.json.data.id;
    assert.ok(createdStudentId, 'Created student must have an ID');
  });

  // ── 3. Validation failure returns 422 ─────────────────────────
  test('POST /api/v1/students — invalid payload returns 422 with error list', async () => {
    const res = await apiRequest('POST', '/api/v1/students', {
      name:  'X',
      email: 'not-an-email',
    });

    assert.equal(res.status, 422, 'Should return HTTP 422');
    assert.equal(res.json.success, false);
    assert.ok(Array.isArray(res.json.errors), 'Should return errors array');
  });

  // ── 4. Retrieve all students via GET ──────────────────────────
  test('GET /api/v1/students — lists students with pagination metadata', async () => {
    const res = await apiRequest('GET', '/api/v1/students');
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.ok(Array.isArray(res.json.data), 'data property must be an array');
    assert.ok(res.json.meta, 'meta property must be present');
    assert.ok(res.json.meta.total >= 1, 'Total count must be at least 1');
  });

  // ── 5. Query filtering via GET ────────────────────────────────
  test('GET /api/v1/students?q=API+Test — filters students by search term', async () => {
    const res = await apiRequest('GET', '/api/v1/students?q=API+Test');
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.ok(res.json.data.length >= 1);
    assert.equal(res.json.data[0].name, 'API Test Student');
  });

  // ── 6. Retrieve single student by ID ──────────────────────────
  test('GET /api/v1/students/:id — retrieves specific student', async () => {
    const res = await apiRequest('GET', `/api/v1/students/${createdStudentId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.data.id, createdStudentId);
    assert.equal(res.json.data.email, 'api.student@example.com');
    assert.equal(res.json.data.passwordHash, undefined, 'passwordHash must never be exposed');
  });

  test('GET /api/v1/students/99999 — returns 404 for unknown ID', async () => {
    const res = await apiRequest('GET', '/api/v1/students/99999');
    assert.equal(res.status, 404);
    assert.equal(res.json.success, false);
    assert.equal(res.json.code, 404);
  });

  // ── 7. Update student via PUT ─────────────────────────────────
  test('PUT /api/v1/students/:id — updates student attributes', async () => {
    const res = await apiRequest('PUT', `/api/v1/students/${createdStudentId}`, {
      course: 'Cybersecurity',
      year:   '4th Year',
    });

    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.data.course, 'Cybersecurity');
    assert.equal(res.json.data.year, '4th Year');
  });

  test('PUT /api/v1/students/99999 — returns 404 for unknown ID', async () => {
    const res = await apiRequest('PUT', '/api/v1/students/99999', { course: 'Data Science' });
    assert.equal(res.status, 404);
    assert.equal(res.json.success, false);
  });

  // ── 8. Delete student via DELETE ──────────────────────────────
  test('DELETE /api/v1/students/:id — deletes student and returns 200', async () => {
    const res = await apiRequest('DELETE', `/api/v1/students/${createdStudentId}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.deletedId, createdStudentId);

    // Verify it is gone
    const verifyRes = await apiRequest('GET', `/api/v1/students/${createdStudentId}`);
    assert.equal(verifyRes.status, 404);
  });

  test('DELETE /api/v1/students/99999 — returns 404 for non-existent student', async () => {
    const res = await apiRequest('DELETE', '/api/v1/students/99999');
    assert.equal(res.status, 404);
    assert.equal(res.json.success, false);
  });

  // ── 9. API 404 returns JSON ───────────────────────────────────
  test('GET /api/unknown-endpoint — returns JSON 404', async () => {
    const res = await apiRequest('GET', '/api/unknown-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.json.success, false);
    assert.ok(res.json.error.includes('Not Found'));
  });

  // ── 10. API Docs UI Removal & Direct Routes ───────────────────
  test('Navbar does not expose API Docs link in public UI', async () => {
    const res = await apiRequest('GET', '/');
    assert.equal(res.status, 200);
    assert.ok(!res.body.includes('href="/api/docs"'), 'Navbar must not contain /api/docs link');
    assert.ok(!res.body.includes('>API Docs<'), 'Navbar must not expose API Docs text');
  });

  test('Developer direct routes (/api-docs and /docs) remain active', async () => {
    const docsRes = await apiRequest('GET', '/docs');
    assert.equal(docsRes.status, 200);
    assert.ok(docsRes.body.includes('RESTful API Documentation'));

    const apiDocsRes = await apiRequest('GET', '/api-docs');
    assert.equal(apiDocsRes.status, 200);
    assert.ok(apiDocsRes.body.includes('RESTful API Documentation'));
  });

});
