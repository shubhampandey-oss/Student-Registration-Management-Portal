/**
 * tests/task4.test.js
 * Automated tests for Task 4 using Node.js built-in test runner.
 *
 * Run with: node --test tests/task4.test.js
 *
 * Tests cover:
 *  - Password strength evaluation engine (evaluatePasswordStrength)
 *  - Server-side validation for account passwords and complexity
 *  - Password confirmation matching
 *  - Conditional validation for Hostel / Campus Accommodation
 *  - Conditional validation for Merit Scholarship Application
 *  - Bcrypt password hashing and safe storage (no plaintext passwords)
 *  - Full HTTP POST submission with Task 4 attributes
 *  - Student profile rendering security status and conditional services
 */

'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const bcrypt = require('bcrypt');

process.env.NODE_ENV = 'test';
process.env.PORT     = '3096';

const { app, server } = require('../src/app');
const { _students }   = require('../src/controllers/student.controller');
const {
  evaluatePasswordStrength,
  validateStudentTask4,
  VALID_ROOM_TYPES,
  VALID_DIETARY,
  VALID_INCOME_BRACKETS,
} = require('../src/utils/validation');

const BASE = 'http://localhost:3096';

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
      port: 3096,
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

describe('Task 4 — Dynamic DOM, Password Security & Conditional Forms', () => {

  before(async () => {
    await new Promise(r => setTimeout(r, 200));
  });

  after(() => {
    server.close();
  });

  // ── 1. Form rendering with Task 4 controls ────────────────────
  test('GET /students/register — renders password fields and conditional toggles', async () => {
    const { status, body } = await get('/students/register');
    assert.equal(status, 200);
    assert.ok(body.includes('id="password"'), 'Must contain password field');
    assert.ok(body.includes('id="confirmPassword"'), 'Must contain confirm password field');
    assert.ok(body.includes('id="passwordStrengthBar"'), 'Must contain strength progress bar');
    assert.ok(body.includes('id="requiresHostelToggle"'), 'Must contain hostel toggle');
    assert.ok(body.includes('id="appliesScholarshipToggle"'), 'Must contain scholarship toggle');
    assert.ok(body.includes('id="confirmSubmitModal"'), 'Must contain confirmation review modal');
  });

  // ── 2. Full valid submission with password, hostel, scholarship
  test('POST /students/register — valid submission with credentials & facilities', async () => {
    const payload = {
      formVersion:        '4',
      name:               'Vikramaditya Rao',
      email:              'vikram.rao@example.com',
      course:             'Computer Science',
      year:               '1st Year',
      dob:                '2004-03-21',
      gender:             'Male',
      phone:              '+91 98333 44455',
      password:           'Secret@Pass2026',
      confirmPassword:    'Secret@Pass2026',
      requiresHostel:     'on',
      roomType:           'Double',
      dietary:            'Vegetarian',
      emergencyContact:   'Kailash Rao (Father)',
      emergencyPhone:     '+91 98222 11100',
      appliesScholarship: 'on',
      prevGpa:            '9.2',
      annualIncome:       '< 2.5 LPA',
    };

    const { status, headers } = await post('/students/register', payload);
    assert.equal(status, 302, 'Should redirect after successful Task 4 registration');
    assert.ok(headers.location && headers.location.startsWith('/students/'));

    // Follow redirect to profile page
    const profileRes = await get(headers.location);
    assert.equal(profileRes.status, 200);
    assert.ok(profileRes.body.includes('Vikramaditya Rao'));
    assert.ok(profileRes.body.includes('Bcrypt Encrypted'), 'Profile should show bcrypt encrypted badge');
    assert.ok(profileRes.body.includes('Campus Hostel Allocation'), 'Profile should display hostel section');
    assert.ok(profileRes.body.includes('Double Room'), 'Profile should show double room preference');
    assert.ok(profileRes.body.includes('Merit Scholarship Application'), 'Profile should display scholarship section');
    assert.ok(profileRes.body.includes('9.2'), 'Profile should show previous academic score');

    // Verify plaintext password is NEVER stored or leaked
    assert.ok(!profileRes.body.includes('Secret@Pass2026'), 'Plaintext password must never appear in response body');

    // Verify backend student storage has valid bcrypt hash
    const saved = _students.find(s => s.email === 'vikram.rao@example.com');
    assert.ok(saved, 'Student record should be saved in store');
    assert.ok(saved.passwordHash, 'Password hash must be generated');
    assert.notEqual(saved.passwordHash, 'Secret@Pass2026', 'Password must not be stored in plaintext');
    const isMatch = await bcrypt.compare('Secret@Pass2026', saved.passwordHash);
    assert.equal(isMatch, true, 'Bcrypt compare should verify hash with correct password');
  });

  // ── 3. Password validation rejection ─────────────────────────
  test('POST /students/register — rejects weak password', async () => {
    const { status, body } = await post('/students/register', {
      formVersion:     '4',
      name:            'Tester One',
      email:           'test1@example.com',
      course:          'Web Development',
      year:            '1st Year',
      dob:             '2003-01-01',
      gender:          'Other',
      phone:           '9876543210',
      password:        'weak',
      confirmPassword: 'weak',
    });
    assert.equal(status, 422);
    assert.ok(body.includes('at least 8 characters long'));
  });

  test('POST /students/register — rejects mismatched passwords', async () => {
    const { status, body } = await post('/students/register', {
      formVersion:     '4',
      name:            'Tester Two',
      email:           'test2@example.com',
      course:          'Web Development',
      year:            '1st Year',
      dob:             '2003-01-01',
      gender:          'Other',
      phone:           '9876543210',
      password:        'Secure@Password123',
      confirmPassword: 'Different@Password456',
    });
    assert.equal(status, 422);
    assert.ok(body.includes('Passwords do not match'));
  });

  // ── 4. Conditional fields validation ──────────────────────────
  test('POST /students/register — rejects missing hostel emergency phone when hostel is requested', async () => {
    const { status, body } = await post('/students/register', {
      formVersion:      '4',
      name:             'Hostel Student',
      email:            'hostel@example.com',
      course:           'Data Science',
      year:             '2nd Year',
      dob:              '2002-05-15',
      gender:           'Female',
      phone:            '9876543210',
      password:         'Strong@Pass2026',
      confirmPassword:  'Strong@Pass2026',
      requiresHostel:   'on',
      roomType:         'Single',
      dietary:          'Vegan',
      emergencyContact: 'Mother',
      emergencyPhone:   '', // missing!
    });
    assert.equal(status, 422);
    assert.ok(body.includes('Emergency contact phone'));
  });

  test('POST /students/register — rejects low score for merit scholarship', async () => {
    const { status, body } = await post('/students/register', {
      formVersion:        '4',
      name:               'Scholar Student',
      email:              'scholar@example.com',
      course:             'Artificial Intelligence',
      year:               '3rd Year',
      dob:                '2003-09-09',
      gender:             'Male',
      phone:              '9876543210',
      password:           'Strong@Pass2026',
      confirmPassword:    'Strong@Pass2026',
      appliesScholarship: 'on',
      prevGpa:            '4.5', // below 6.0 threshold!
      annualIncome:       '< 2.5 LPA',
    });
    assert.equal(status, 422);
    assert.ok(body.includes('Minimum 6.0 CGPA'));
  });

});

// ── Unit Tests: Password Strength Evaluator ───────────────────
describe('Task 4 — evaluatePasswordStrength Unit Tests', () => {

  test('evaluates weak passwords properly', () => {
    const weak = evaluatePasswordStrength('simple');
    assert.equal(weak.checks.minLength, false);
    assert.equal(weak.label, 'Very Weak');
  });

  test('evaluates strong passwords properly', () => {
    const strong = evaluatePasswordStrength('SuperSecure#2026');
    assert.equal(strong.checks.minLength, true);
    assert.equal(strong.checks.hasUpper, true);
    assert.equal(strong.checks.hasLower, true);
    assert.equal(strong.checks.hasDigit, true);
    assert.equal(strong.checks.hasSpecial, true);
    assert.equal(strong.label, 'Very Strong');
    assert.equal(strong.percent, 100);
  });

});
