/**
 * tests/task1.test.js
 * Automated tests for Task 1 using Node.js built-in test runner.
 *
 * Run with: npm test
 *
 * Tests cover:
 *  - Server startup
 *  - Home page renders (200)
 *  - Registration form renders (200)
 *  - Students list renders (200)
 *  - Valid form submission redirects (302)
 *  - Invalid form submission returns errors (422)
 *  - 404 handling
 *  - Server-side validation rules
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// We need the app but don't want it to actually listen during tests.
// The module exports { app, server }; we close the server after tests.
process.env.NODE_ENV = 'test';
process.env.PORT     = '3099'; // Use a test port to avoid conflicts.

const { app, server } = require('../src/app');

const BASE = 'http://localhost:3099';

/** Simple HTTP GET helper — returns { status, body } */
function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

/** Simple HTTP POST helper with URL-encoded body */
function post(path, fields) {
  const body = new URLSearchParams(fields).toString();
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3099,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Test Suite ────────────────────────────────────────────────

describe('Task 1 — Express Server and EJS Rendering', () => {

  before(async () => {
    // Wait briefly for the server to be ready
    await new Promise(r => setTimeout(r, 200));
  });

  after(() => {
    server.close();
  });

  // ── Server availability ──────────────────────────────────────
  test('GET / — home page returns 200', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200, 'Home page should return HTTP 200');
    assert.ok(body.includes('Student Registration'), 'Home page should contain page title text');
  });

  // ── Registration form ─────────────────────────────────────────
  test('GET /students/register — form page returns 200', async () => {
    const { status, body } = await get('/students/register');
    assert.equal(status, 200, 'Register page should return HTTP 200');
    assert.ok(body.includes('registrationForm'), 'Page should include the registration form');
    assert.ok(body.includes('name="name"'), 'Form should have a name field');
    assert.ok(body.includes('name="email"'), 'Form should have an email field');
    assert.ok(body.includes('name="course"'), 'Form should have a course field');
    assert.ok(body.includes('name="phone"'), 'Form should have a phone field');
  });

  // ── Students list ─────────────────────────────────────────────
  test('GET /students — list page returns 200', async () => {
    const { status, body } = await get('/students');
    assert.equal(status, 200, 'Students list page should return HTTP 200');
    assert.ok(body.includes('Registered Students'), 'Page should show the list heading');
  });

  // ── Valid submission ──────────────────────────────────────────
  test('POST /students/register — valid data redirects to profile', async () => {
    const { status, headers } = await post('/students/register', {
      name:    'Test Student',
      email:   'test.student@example.com',
      course:  'Computer Science',
      phone:   '+91 99999 00001',
      message: 'This is a test submission.',
    });
    assert.equal(status, 302, 'Valid submission should redirect (302)');
    assert.ok(
      headers.location && headers.location.startsWith('/students/'),
      `Redirect location should start with /students/, got: ${headers.location}`
    );
  });

  // ── Follow redirect and see success flash ─────────────────────
  test('GET profile after valid submission — shows success message', async () => {
    // Post first to get an ID
    const postRes = await post('/students/register', {
      name:   'Flash Test',
      email:  'flash@example.com',
      course: 'Data Science',
      phone:  '07700900123',
    });
    // postRes.headers.location is e.g. '/students/3'
    // We append ?success=1 so the controller shows the flash banner
    const rawLocation = postRes.headers.location || '';
    // Strip any trailing query string the server might have added, then add ours
    const basePath    = rawLocation.split('?')[0];
    const { status, body } = await get(`${basePath}?success=1`);
    assert.equal(status, 200, 'Profile page should return 200');
    assert.ok(body.includes('Flash Test'), 'Profile should show the student name');
    assert.ok(body.includes('Data Science'), 'Profile should show the course');
    assert.ok(body.includes('Registration successful'), 'Profile should show success flash message');
  });

  // ── Invalid submission — all fields empty ─────────────────────
  test('POST /students/register — empty form returns 422 with errors', async () => {
    const { status, body } = await post('/students/register', {});
    assert.equal(status, 422, 'Empty form submission should return HTTP 422');
    assert.ok(body.includes('is required'), 'Response should include validation error messages');
    assert.ok(body.includes('registrationForm'), 'Form should be re-rendered on error');
  });

  // ── Invalid email ─────────────────────────────────────────────
  test('POST /students/register — bad email returns 422 with email error', async () => {
    const { status, body } = await post('/students/register', {
      name:   'Valid Name',
      email:  'not-an-email',
      course: 'Computer Science',
      phone:  '07700900000',
    });
    assert.equal(status, 422);
    assert.ok(body.includes('valid email'), 'Should show email validation error');
  });

  // ── Invalid course ────────────────────────────────────────────
  test('POST /students/register — invalid course value returns 422', async () => {
    const { status, body } = await post('/students/register', {
      name:   'Valid Name',
      email:  'valid@example.com',
      course: 'Hacking',
      phone:  '07700900000',
    });
    assert.equal(status, 422);
    assert.ok(body.includes('valid course'), 'Should show course validation error');
  });

  // ── 404 handling ──────────────────────────────────────────────
  test('GET /nonexistent — returns 404 page', async () => {
    const { status, body } = await get('/nonexistent-page-xyz');
    assert.equal(status, 404, 'Unknown route should return HTTP 404');
    assert.ok(body.includes('404'), 'Error page should show the error code');
  });

  // ── Unknown student ID ────────────────────────────────────────
  test('GET /students/99999 — returns 404 for unknown student', async () => {
    const { status, body } = await get('/students/99999');
    assert.equal(status, 404, 'Missing student should return 404');
    assert.ok(body.includes('99999'), 'Error page should mention the requested ID');
  });

});

// ── Validation unit tests (no HTTP) ──────────────────────────
describe('Task 1 — Server-side Validation Logic', () => {
  const { validateStudentTask1 } = require('../src/utils/validation');

  test('validates successfully with all correct fields', () => {
    const errs = validateStudentTask1({
      name: 'Priya Sharma', email: 'priya@example.com',
      course: 'Computer Science', phone: '+91 98765 43210', message: ''
    });
    assert.equal(errs.length, 0, 'Valid data should produce zero errors');
  });

  test('rejects empty name', () => {
    const errs = validateStudentTask1({ name: '', email: 'a@b.com', course: 'Computer Science', phone: '1234567' });
    assert.ok(errs.some(e => e.field === 'name'), 'Should flag empty name');
  });

  test('rejects name shorter than 2 chars', () => {
    const errs = validateStudentTask1({ name: 'A', email: 'a@b.com', course: 'Computer Science', phone: '1234567' });
    assert.ok(errs.some(e => e.field === 'name'), 'Should flag short name');
  });

  test('rejects name with digits', () => {
    const errs = validateStudentTask1({ name: 'User123', email: 'a@b.com', course: 'Computer Science', phone: '1234567' });
    assert.ok(errs.some(e => e.field === 'name'), 'Should reject name with digits');
  });

  test('rejects invalid email format', () => {
    const errs = validateStudentTask1({ name: 'Valid Name', email: 'bademail', course: 'Computer Science', phone: '1234567' });
    assert.ok(errs.some(e => e.field === 'email'), 'Should flag invalid email');
  });

  test('rejects invalid course', () => {
    const errs = validateStudentTask1({ name: 'Valid Name', email: 'a@b.com', course: 'Invalid', phone: '1234567' });
    assert.ok(errs.some(e => e.field === 'course'), 'Should flag invalid course');
  });

  test('rejects phone too short', () => {
    const errs = validateStudentTask1({ name: 'Valid Name', email: 'a@b.com', course: 'Computer Science', phone: '123' });
    assert.ok(errs.some(e => e.field === 'phone'), 'Should flag phone too short');
  });

  test('rejects message longer than 500 chars', () => {
    const errs = validateStudentTask1({ name: 'Valid Name', email: 'a@b.com', course: 'Computer Science', phone: '1234567', message: 'x'.repeat(501) });
    assert.ok(errs.some(e => e.field === 'message'), 'Should flag message too long');
  });

  test('accepts optional empty message', () => {
    const errs = validateStudentTask1({ name: 'Valid Name', email: 'a@b.com', course: 'Computer Science', phone: '1234567', message: '' });
    assert.ok(!errs.some(e => e.field === 'message'), 'Empty message should be accepted');
  });
});
