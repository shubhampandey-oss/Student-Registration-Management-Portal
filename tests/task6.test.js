'use strict';

/**
 * tests/task6.test.js
 * Automated test suite for Task 6 — Database Integration & User Authentication.
 * Tests SQLite persistence, user registration, bcrypt password hashing,
 * session lifecycle, authentication guards, and role-based access control.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// Use isolated test port
process.env.PORT = '3094';
process.env.NODE_ENV = 'test';

const { app, server } = require('../src/app');
const dbManager       = require('../src/models/db');
const userStore       = require('../src/models/user.store');
const studentStore    = require('../src/models/student.store');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3094,
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

describe('Task 6 — Database Integration & User Authentication', () => {

  before(async () => {
    await dbManager.ensureDbReady();
  });

  after(() => {
    if (server && server.close) {
      server.close();
    }
  });

  // ── Database & Seed Verification ───────────────────────────
  it('SQLite is initialized and default users/students are seeded', () => {
    const admin = userStore.findByEmail('admin@cognifyz.com');
    assert.ok(admin, 'Admin user should exist in SQLite');
    assert.equal(admin.role, 'admin');

    const studentUser = userStore.findByEmail('student@cognifyz.com');
    assert.ok(studentUser, 'Student user should exist in SQLite');
    assert.equal(studentUser.role, 'student');

    const students = studentStore.getAll();
    assert.ok(students.length >= 3, 'Initial students should be seeded in SQLite');
  });

  // ── User Store Unit Logic ──────────────────────────────────
  it('userStore.authenticate succeeds with correct password and rejects wrong password', async () => {
    const valid = await userStore.authenticate('admin@cognifyz.com', 'Admin@12345');
    assert.ok(valid, 'Authentication should succeed with valid credentials');
    assert.equal(valid.email, 'admin@cognifyz.com');
    assert.equal(typeof valid.passwordHash, 'undefined', 'passwordHash must be stripped from sanitized user');

    const invalid = await userStore.authenticate('admin@cognifyz.com', 'WrongPassword!123');
    assert.equal(invalid, null, 'Authentication must return null for wrong password');

    const nonexistent = await userStore.authenticate('nobody@example.com', 'AnyPassword123');
    assert.equal(nonexistent, null, 'Authentication must return null for non-existent email');
  });

  it('userStore.create hashes password with bcrypt and prevents duplicate emails', async () => {
    const testEmail = `test_${Date.now()}@example.com`;
    const created = await userStore.create({
      name: 'Test New User',
      email: testEmail,
      password: 'SecurePassword@123',
      role: 'student',
    });

    assert.ok(created.id, 'Created user should receive auto-increment ID');
    assert.equal(created.email, testEmail);

    // Attempting to create user with duplicate email should throw
    await assert.rejects(async () => {
      await userStore.create({
        name: 'Duplicate',
        email: testEmail,
        password: 'AnotherPassword@123',
      });
    }, /already exists/);
  });

  // ── Auth Views & HTTP Routes ───────────────────────────────
  it('GET /auth/login — returns 200 with login form', async () => {
    const res = await request({ method: 'GET', path: '/auth/login' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Sign In'), 'Should display Sign In header');
    assert.ok(res.body.includes('name="email"'), 'Should contain email input');
    assert.ok(res.body.includes('name="password"'), 'Should contain password input');
  });

  it('GET /auth/register — returns 200 with registration form', async () => {
    const res = await request({ method: 'GET', path: '/auth/register' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Create Account'), 'Should display Create Account header');
    assert.ok(res.body.includes('name="name"'), 'Should contain name input');
    assert.ok(res.body.includes('name="role"'), 'Should contain role selector');
  });

  it('POST /auth/login — invalid credentials returns 401', async () => {
    const payload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      password: 'IncorrectPassword999',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 401);
    assert.ok(res.body.includes('Invalid email address or password'), 'Should display error feedback');
  });

  it('POST /auth/login — valid credentials logs in, sets session cookie, redirects', async () => {
    const payload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      password: 'Admin@12345',
      returnUrl: '/students',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, '/students');
    const cookie = parseCookies(res);
    assert.ok(cookie.includes('connect.sid'), 'Should set express session cookie');
  });

  it('GET /auth/me — returns session state JSON', async () => {
    // Unauthenticated
    const resUnauth = await request({ method: 'GET', path: '/auth/me' });
    const jsonUnauth = JSON.parse(resUnauth.body);
    assert.equal(jsonUnauth.authenticated, false);

    // Authenticated session
    const payload = new URLSearchParams({
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    const sessionCookie = parseCookies(loginRes);
    const resAuth = await request({
      method: 'GET',
      path: '/auth/me',
      headers: { 'Cookie': sessionCookie },
    });

    const jsonAuth = JSON.parse(resAuth.body);
    assert.equal(jsonAuth.authenticated, true);
    assert.equal(jsonAuth.user.email, 'student@cognifyz.com');
  });

  // ── Protected Routes & Access Control ──────────────────────
  it('GET /auth/dashboard — unauthenticated request redirects to /auth/login', async () => {
    const res = await request({ method: 'GET', path: '/auth/dashboard' });
    assert.equal(res.statusCode, 302);
    assert.ok(res.headers.location.startsWith('/auth/login'), 'Should redirect to login');
  });

  it('GET /auth/dashboard — authenticated request succeeds with 200', async () => {
    const payload = new URLSearchParams({
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    const sessionCookie = parseCookies(loginRes);
    const dashRes = await request({
      method: 'GET',
      path: '/auth/dashboard',
      headers: { 'Cookie': sessionCookie },
    });

    assert.equal(dashRes.statusCode, 200);
    assert.ok(dashRes.body.includes('User Dashboard'), 'Should render dashboard');
    assert.ok(dashRes.body.includes('student@cognifyz.com'), 'Should display user email');
  });

  it('GET /auth/admin — student role is denied, admin role is granted 200', async () => {
    // 1. Student login
    const studentPayload = new URLSearchParams({
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const studentLogin = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(studentPayload),
      },
    }, studentPayload);

    const studentCookie = parseCookies(studentLogin);
    const studentAdminRes = await request({
      method: 'GET',
      path: '/auth/admin',
      headers: { 'Cookie': studentCookie },
    });
    assert.equal(studentAdminRes.statusCode, 302, 'Student should be redirected away from admin console');

    // 2. Admin login
    const adminPayload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      password: 'Admin@12345',
    }).toString();

    const adminLogin = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(adminPayload),
      },
    }, adminPayload);

    const adminCookie = parseCookies(adminLogin);
    const adminRes = await request({
      method: 'GET',
      path: '/auth/admin',
      headers: { 'Cookie': adminCookie },
    });
    assert.equal(adminRes.statusCode, 200, 'Admin should be granted access to admin console');
    assert.ok(adminRes.body.includes('Administrator Console'), 'Should render admin console');
  });

  it('GET /auth/logout — terminates session and redirects to home', async () => {
    const res = await request({ method: 'GET', path: '/auth/logout' });
    assert.equal(res.statusCode, 302);
    assert.ok(res.headers.location.startsWith('/'), 'Should redirect to home page');
  });

});
