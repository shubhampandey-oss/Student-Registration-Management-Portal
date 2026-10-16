/**
 * tests/task3.test.js
 * Automated tests for Task 3 using Node.js built-in test runner.
 *
 * Run with: node --test tests/task3.test.js
 *
 * Tests cover:
 *  - Responsive meta tags and accessibility skip links
 *  - Responsive navbar collapse toggle structure
 *  - Search & filter toolbar rendering on students directory
 *  - Responsive grid column classes (col-12 col-md-6 col-lg-4 col-xl-3)
 *  - Server-side search query filtering (GET /students?q=...)
 *  - Server-side course filtering (GET /students?course=...)
 *  - Server-side year filtering (GET /students?year=...)
 *  - Empty filter result handling
 *  - Floating back-to-top component
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

process.env.NODE_ENV = 'test';
process.env.PORT     = '3097';

const { app, server } = require('../src/app');
const { _students }   = require('../src/controllers/student.controller');

const BASE = 'http://localhost:3097';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

function post(path, fields) {
  const body = new URLSearchParams(fields).toString();
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3097,
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

describe('Task 3 — Responsive Design, Search/Filter & Layout Polish', () => {

  before(async () => {
    await new Promise(r => setTimeout(r, 200));

    // Seed test students for search and filter testing
    await post('/students/register', {
      formVersion: '2',
      name:        'Rohan Sharma',
      email:       'rohan.sharma@example.com',
      course:      'Data Science',
      year:        '2nd Year',
      dob:         '2003-04-10',
      gender:      'Male',
      phone:       '+91 98111 00001',
    });

    await post('/students/register', {
      formVersion: '2',
      name:        'Pooja Hegde',
      email:       'pooja.hegde@example.com',
      course:      'Cybersecurity',
      year:        '4th Year',
      dob:         '2001-09-25',
      gender:      'Female',
      phone:       '+91 98222 00002',
    });
  });

  after(() => {
    server.close();
  });

  // ── 1. Responsive & Accessibility Head Elements ──────────────
  test('GET / — contains responsive viewport meta tag', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200);
    assert.ok(body.includes('name="viewport"'), 'Page must contain viewport meta tag');
    assert.ok(body.includes('width=device-width'), 'Viewport must specify width=device-width');
    assert.ok(body.includes('initial-scale=1.0'), 'Viewport must specify initial-scale=1.0');
  });

  test('GET / — contains accessible skip-to-main-content link', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200);
    assert.ok(body.includes('cp-skip-link'), 'Page should include skip link class');
    assert.ok(body.includes('href="#mainContent"'), 'Skip link should target #mainContent');
  });

  test('GET / — contains responsive collapsible navbar toggle', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200);
    assert.ok(body.includes('navbar-toggler'), 'Navbar should include hamburger toggler');
    assert.ok(body.includes('data-bs-target="#navbarContent"'), 'Toggler should target navbarContent');
  });

  test('GET / — contains back-to-top button in footer', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200);
    assert.ok(body.includes('id="backToTopBtn"'), 'Page must include back-to-top button');
    assert.ok(body.includes('cp-back-to-top'), 'Button should have cp-back-to-top class');
  });

  // ── 2. Search & Filter Toolbar ────────────────────────────────
  test('GET /students — renders search and filter toolbar', async () => {
    const { status, body } = await get('/students');
    assert.equal(status, 200);
    assert.ok(body.includes('id="studentSearchInput"'), 'Should render search input');
    assert.ok(body.includes('id="courseFilterSelect"'), 'Should render course filter dropdown');
    assert.ok(body.includes('id="yearFilterSelect"'), 'Should render year filter dropdown');
    assert.ok(body.includes('cp-quick-filters'), 'Should render quick filter category buttons');
    assert.ok(body.includes('id="studentResultsCounter"'), 'Should render dynamic results counter');
  });

  // ── 3. Responsive Grid Column Classes ─────────────────────────
  test('GET /students — cards use responsive grid breakpoint classes', async () => {
    const { status, body } = await get('/students');
    assert.equal(status, 200);
    assert.ok(body.includes('col-12'), 'Cards should support full width on mobile (col-12)');
    assert.ok(body.includes('col-md-6'), 'Cards should support 2 columns on tablet (col-md-6)');
    assert.ok(body.includes('col-lg-4'), 'Cards should support 3 columns on desktop (col-lg-4)');
    assert.ok(body.includes('col-xl-3'), 'Cards should support 4 columns on large screens (col-xl-3)');
  });

  // ── 4. Server-Side Search Filtering ───────────────────────────
  test('GET /students?q=Rohan — filters students matching name', async () => {
    const { status, body } = await get('/students?q=Rohan');
    assert.equal(status, 200);
    assert.ok(body.includes('Rohan Sharma'), 'Should include matching student Rohan Sharma');
    assert.ok(!body.includes('Pooja Hegde'), 'Should exclude non-matching student Pooja Hegde');
  });

  test('GET /students?course=Cybersecurity — filters students matching course', async () => {
    const { status, body } = await get('/students?course=Cybersecurity');
    assert.equal(status, 200);
    assert.ok(body.includes('Pooja Hegde'), 'Should include Pooja Hegde');
    assert.ok(!body.includes('Rohan Sharma'), 'Should exclude Rohan Sharma');
  });

  test('GET /students?year=2nd+Year — filters students matching year', async () => {
    const { status, body } = await get('/students?year=2nd+Year');
    assert.equal(status, 200);
    assert.ok(body.includes('Rohan Sharma'), 'Should include 2nd Year student');
    assert.ok(!body.includes('Pooja Hegde'), 'Should exclude 4th Year student');
  });

  test('GET /students?q=NonExistentStudentXYZ — handles zero matches gracefully', async () => {
    const { status, body } = await get('/students?q=NonExistentStudentXYZ');
    assert.equal(status, 200);
    assert.ok(body.includes('No matching students found'), 'Should display empty search message');
    assert.ok(body.includes('resetFiltersBtn'), 'Should provide reset filters button');
  });

});
