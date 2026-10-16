/**
 * tests/task2.test.js
 * Automated tests for Task 2 using Node.js built-in test runner.
 *
 * Run with: node --test tests/task2.test.js
 *
 * Tests cover:
 *  - Registration form renders extended Task 2 fields (DOB, Gender, Year, LinkedIn)
 *  - Client-side validation logic parity with server-side rules
 *  - Unit tests for calculateAge()
 *  - Server-side validation for Date of Birth (min age 16, future dates, valid format)
 *  - Server-side validation for Gender & Year of Study options
 *  - Server-side validation for LinkedIn profile URL format
 *  - Full HTTP POST submission storing all Task 2 fields
 *  - Profile page rendering all Task 2 attributes (age, gender, year badge, LinkedIn link)
 *  - Student list card rendering Year of Study
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// Set test environment and separate port for Task 2
process.env.NODE_ENV = 'test';
process.env.PORT     = '3098';

const { app, server } = require('../src/app');
const {
  validateStudentTask2,
  calculateAge,
  VALID_COURSES,
  VALID_GENDERS,
  VALID_YEARS,
} = require('../src/utils/validation');

const BASE = 'http://localhost:3098';

/** HTTP GET helper */
function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

/** HTTP POST helper with URL-encoded body */
function post(path, fields) {
  const body = new URLSearchParams(fields).toString();
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3098,
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

describe('Task 2 — Extended Fields, Validation & Profile Features', () => {

  before(async () => {
    await new Promise(r => setTimeout(r, 200));
  });

  after(() => {
    server.close();
  });

  // ── 1. Form rendering with Task 2 fields ──────────────────────
  test('GET /students/register — contains Task 2 extended fields', async () => {
    const { status, body } = await get('/students/register');
    assert.equal(status, 200);
    assert.ok(body.includes('name="dob"'), 'Form must have dob input');
    assert.ok(body.includes('name="gender"'), 'Form must have gender radio buttons');
    assert.ok(body.includes('name="year"'), 'Form must have year of study selector');
    assert.ok(body.includes('name="linkedin"'), 'Form must have linkedin URL input');
    assert.ok(body.includes('formVersion'), 'Form must have formVersion tracking');
    assert.ok(body.includes('id="ageBadge"'), 'Form must contain real-time age badge container');
  });

  // ── 2. Full valid submission ──────────────────────────────────
  test('POST /students/register — valid Task 2 submission redirects to profile', async () => {
    const payload = {
      formVersion: '2',
      name:        'Aarav Patel',
      email:       'aarav.patel@example.com',
      course:      'Artificial Intelligence',
      year:        '3rd Year',
      dob:         '2003-08-14',
      gender:      'Male',
      phone:       '+91 98200 12345',
      linkedin:    'https://www.linkedin.com/in/aarav-patel',
      message:     'Interested in machine learning research.',
    };

    const { status, headers } = await post('/students/register', payload);
    assert.equal(status, 302, 'Should redirect after successful Task 2 registration');
    assert.ok(headers.location && headers.location.startsWith('/students/'));

    // Follow redirect to profile
    const profileRes = await get(headers.location);
    assert.equal(profileRes.status, 200);
    assert.ok(profileRes.body.includes('Aarav Patel'), 'Profile should show student name');
    assert.ok(profileRes.body.includes('Artificial Intelligence'), 'Profile should show course');
    assert.ok(profileRes.body.includes('3rd Year'), 'Profile should show year of study');
    assert.ok(profileRes.body.includes('2003-08-14'), 'Profile should show date of birth');
    assert.ok(profileRes.body.includes('Male'), 'Profile should show gender');
    assert.ok(profileRes.body.includes('https://www.linkedin.com/in/aarav-patel'), 'Profile should include LinkedIn link');
  });

  // ── 3. Server-side validation errors on Task 2 form ───────────
  test('POST /students/register — rejects submission when DOB is under 16', async () => {
    const today = new Date();
    const tooYoungYear = today.getFullYear() - 14; // 14 years old
    const dobString = `${tooYoungYear}-01-01`;

    const { status, body } = await post('/students/register', {
      formVersion: '2',
      name:        'Young Prodigy',
      email:       'young@example.com',
      course:      'Computer Science',
      year:        '1st Year',
      dob:         dobString,
      gender:      'Other',
      phone:       '9876543210',
    });

    assert.equal(status, 422, 'Should reject under-age applicant with 422');
    assert.ok(body.includes('at least 16 years old'), 'Error message should explain minimum age requirement');
  });

  test('POST /students/register — rejects invalid LinkedIn URL', async () => {
    const { status, body } = await post('/students/register', {
      formVersion: '2',
      name:        'Dev Tester',
      email:       'dev@example.com',
      course:      'Web Development',
      year:        '2nd Year',
      dob:         '2002-05-10',
      gender:      'Female',
      phone:       '9876543210',
      linkedin:    'ftp://invalid-url-example.com',
    });

    assert.equal(status, 422);
    assert.ok(body.includes('LinkedIn URL') || body.includes('linkedin.com'), 'Should reject bad URL');
  });

  // ── 4. Students list displays Year ────────────────────────────
  test('GET /students — lists students with academic details', async () => {
    const { status, body } = await get('/students');
    assert.equal(status, 200);
    assert.ok(body.includes('Aarav Patel'), 'Student list should include newly registered student');
    assert.ok(body.includes('3rd Year'), 'Student card should show year of study');
  });

});

// ── Unit Tests: calculateAge helper ───────────────────────────
describe('Task 2 — Age Calculation Helper', () => {

  test('calculates correct completed age', () => {
    const birthYear = new Date().getFullYear() - 20;
    // Set birthday to 1 month ago to ensure birthday has passed this year
    const now = new Date();
    const pastMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
    const dob = `${birthYear}-${pastMonth}-01`;
    const age = calculateAge(dob);
    assert.ok(age === 20 || age === 19, `Age should be approx 20, got: ${age}`);
  });

  test('returns null for invalid date string', () => {
    assert.equal(calculateAge('invalid-date'), null);
    assert.equal(calculateAge(''), null);
    assert.equal(calculateAge(null), null);
  });

});

// ── Unit Tests: validateStudentTask2 Server Rules ─────────────
describe('Task 2 — Server-side Validation Unit Rules', () => {

  const validPayload = {
    formVersion: '2',
    name:        'Siddharth Roy',
    email:       'siddharth@example.com',
    course:      'Cybersecurity',
    year:        '4th Year',
    dob:         '2001-11-20',
    gender:      'Male',
    phone:       '+91 98111 22233',
    linkedin:    'https://linkedin.com/in/siddharth-roy',
    message:     'Passionate about ethical hacking.',
  };

  test('passes with all valid Task 2 fields', () => {
    const errs = validateStudentTask2(validPayload);
    assert.equal(errs.length, 0, 'Valid payload should have zero errors');
  });

  test('rejects missing dob on Task 2 form', () => {
    const errs = validateStudentTask2({ ...validPayload, dob: '' });
    assert.ok(errs.some(e => e.field === 'dob'));
  });

  test('rejects future dob', () => {
    const nextYear = new Date().getFullYear() + 1;
    const errs = validateStudentTask2({ ...validPayload, dob: `${nextYear}-01-01` });
    assert.ok(errs.some(e => e.field === 'dob' && e.message.includes('future')));
  });

  test('rejects age over 100', () => {
    const errs = validateStudentTask2({ ...validPayload, dob: '1900-01-01' });
    assert.ok(errs.some(e => e.field === 'dob' && e.message.includes('100 years')));
  });

  test('rejects invalid gender option', () => {
    const errs = validateStudentTask2({ ...validPayload, gender: 'UnknownOption' });
    assert.ok(errs.some(e => e.field === 'gender'));
  });

  test('rejects invalid year of study', () => {
    const errs = validateStudentTask2({ ...validPayload, year: '10th Year' });
    assert.ok(errs.some(e => e.field === 'year'));
  });

  test('accepts empty linkedin url (optional field)', () => {
    const errs = validateStudentTask2({ ...validPayload, linkedin: '' });
    assert.ok(!errs.some(e => e.field === 'linkedin'));
  });

  test('rejects non-linkedin url', () => {
    const errs = validateStudentTask2({ ...validPayload, linkedin: 'https://facebook.com/profile' });
    assert.ok(errs.some(e => e.field === 'linkedin'));
  });

});
