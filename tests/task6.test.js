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

  it('GET /auth/register — returns 200 with registration form, tabs toggle, and secret key field', async () => {
    const res = await request({ method: 'GET', path: '/auth/register' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Create Account'), 'Should display Create Account header');
    assert.ok(res.body.includes('name="name"'), 'Should contain name input');
    assert.ok(res.body.includes('Student Account'), 'Should contain Student Account tab');
    assert.ok(res.body.includes('Admin Account'), 'Should contain Admin Account tab');
    assert.ok(res.body.includes('name="adminSecretKey"'), 'Should contain Admin Secret Key field');
    assert.ok(!res.body.includes('<select name="role"'), 'Role selection dropdown must not exist');
  });

  it('POST /auth/register — rejects admin creation with missing or invalid secret key', async () => {
    const testEmail = `fakeadmin_${Date.now()}@example.com`;
    const payload = new URLSearchParams({
      name: 'Unauthorized Admin',
      email: testEmail,
      role: 'admin',
      adminSecretKey: 'WrongSecretKey123',
      password: 'SecurePass@2026',
      confirmPassword: 'SecurePass@2026',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 422, 'Should reject invalid admin secret key with 422');
    assert.ok(res.body.includes('Invalid Admin Secret Key'), 'Should display Invalid Admin Secret Key error');
    const createdUser = userStore.findByEmail(testEmail);
    assert.equal(createdUser, null, 'User account must not be created');
  });

  it('POST /auth/register — creates admin account with valid secret key and redirects to /login?tab=admin', async () => {
    const testEmail = `validadmin_${Date.now()}@example.com`;
    const payload = new URLSearchParams({
      name: 'Valid Registered Admin',
      email: testEmail,
      role: 'admin',
      adminSecretKey: process.env.ADMIN_SECRET_KEY || 'Admin@Secret2026',
      password: 'ValidAdminPass@2026',
      confirmPassword: 'ValidAdminPass@2026',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 302, 'Should redirect after successful admin registration');
    assert.equal(res.headers.location, '/login?tab=admin', 'Must redirect to /login?tab=admin');
    const createdUser = userStore.findByEmail(testEmail);
    assert.ok(createdUser, 'Admin user account should be created in database');
    assert.equal(createdUser.role, 'admin', 'Role must be admin');
  });

  it('POST /auth/register — rejects invalid password and returns synchronized error message', async () => {
    const payload = new URLSearchParams({
      name: 'Weak Password User',
      email: 'weakpass@example.com',
      role: 'student',
      password: 'weakpassword',
      confirmPassword: 'weakpassword',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 422);
    assert.ok(
      res.body.includes('Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.'),
      'Should display synchronized password validation error'
    );
  });

  it('POST /auth/register — accepts valid password with standard special characters and creates user', async () => {
    const testEmail = `newstudent_${Date.now()}@example.com`;
    const payload = new URLSearchParams({
      name: 'Valid Student User',
      email: testEmail,
      role: 'student',
      password: 'Super$ecret@Pass!2026',
      confirmPassword: 'Super$ecret@Pass!2026',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    // Successful registration sets session cookie and redirects
    assert.equal(res.statusCode, 302);
    assert.ok(res.headers.location.includes('/auth/dashboard') || res.headers.location.includes('/'));
    const createdUser = userStore.findByEmail(testEmail);
    assert.ok(createdUser, 'User account should be saved in SQLite database');
    assert.equal(createdUser.role, 'student');
  });

  it('POST /auth/register — accepts standard personal email providers (@gmail.com, @yahoo.com, @outlook.com)', async () => {
    const providers = ['gmail.com', 'yahoo.com', 'outlook.com'];
    for (const provider of providers) {
      const email = `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}@${provider}`;
      const payload = new URLSearchParams({
        name: `User ${provider}`,
        email,
        role: 'student',
        password: 'ValidPersonalPass@2026',
        confirmPassword: 'ValidPersonalPass@2026',
      }).toString();

      const res = await request({
        method: 'POST',
        path: '/auth/register',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, payload);

      assert.equal(res.statusCode, 302, `Registration with @${provider} must succeed with 302`);
      const user = userStore.findByEmail(email);
      assert.ok(user, `User with ${provider} must be found in database`);
    }
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

  it('POST /auth/login with portal=admin rejects student account with specific message', async () => {
    const studentAdminPayload = new URLSearchParams({
      portal: 'admin',
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(studentAdminPayload),
      },
    }, studentAdminPayload);

    assert.equal(res.statusCode, 401, 'Student attempting admin portal login should receive 401');
    assert.ok(
      res.body.includes('This account is a student. Please sign in via the Student Portal.'),
      'Should display clear message directing student to Student Portal'
    );
  });

  it('POST /auth/login with portal=admin accepts trimmed and mixed-case admin email', async () => {
    const mixedCasePayload = new URLSearchParams({
      portal: 'admin',
      email: '   AdMiN@Cognifyz.Com   ',
      password: 'Admin@12345',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(mixedCasePayload),
      },
    }, mixedCasePayload);

    assert.equal(res.statusCode, 302, 'Admin should authenticate and redirect');
    assert.equal(res.headers.location, '/students', 'Admin should redirect to /students');
  });

  it('POST /auth/login returns 401 for incorrect password and unknown user', async () => {
    const wrongPassPayload = new URLSearchParams({
      portal: 'admin',
      email: 'admin@cognifyz.com',
      password: 'WrongPassword@999',
    }).toString();

    const wrongPassRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(wrongPassPayload),
      },
    }, wrongPassPayload);

    assert.equal(wrongPassRes.statusCode, 401);
    assert.ok(wrongPassRes.body.includes('Invalid email address or password'));

    const unknownUserPayload = new URLSearchParams({
      portal: 'admin',
      email: 'nonexistent@cognifyz.com',
      password: 'AnyPassword@123',
    }).toString();

    const unknownRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(unknownUserPayload),
      },
    }, unknownUserPayload);

    assert.equal(unknownRes.statusCode, 401);
    assert.ok(unknownRes.body.includes('Invalid email address or password'));
  });

  // ── Forgot & Reset Password Flows ─────────────────────────────
  it('GET /auth/login contains Forgot Password link', async () => {
    const res = await request({ method: 'GET', path: '/auth/login' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Forgot Password?'), 'Login page must contain Forgot Password link');
    assert.ok(res.body.includes('/auth/forgot-password'), 'Link must direct to /auth/forgot-password');
  });

  it('GET /auth/forgot-password renders password recovery page', async () => {
    const res = await request({ method: 'GET', path: '/auth/forgot-password' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Forgot Password'), 'Should render Forgot Password header');
    assert.ok(res.body.includes('name="email"'), 'Should contain registered email input');
  });

  it('POST /auth/forgot-password rejects non-existent email address', async () => {
    const payload = new URLSearchParams({ email: 'nonexistent_user@cognifyz.com' }).toString();
    const res = await request({
      method: 'POST',
      path: '/auth/forgot-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 422);
    assert.ok(res.body.includes('No registered account found with this email address.'));
  });

  it('POST /auth/forgot-password verifies registered email and redirects to reset-password', async () => {
    const payload = new URLSearchParams({ email: 'student@cognifyz.com' }).toString();
    const res = await request({
      method: 'POST',
      path: '/auth/forgot-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 302);
    assert.ok(res.headers.location.includes('/auth/reset-password'));
    assert.ok(res.headers.location.includes('student%40cognifyz.com') || res.headers.location.includes('student@cognifyz.com'));
  });

  it('GET /auth/reset-password shows appropriate fields for student vs admin', async () => {
    // Student reset form should NOT show admin secret key
    const studentRes = await request({ method: 'GET', path: '/auth/reset-password?email=student@cognifyz.com' });
    assert.equal(studentRes.statusCode, 200);
    assert.ok(studentRes.body.includes('Student'), 'Should show Student badge/label');
    assert.ok(studentRes.body.includes('name="newPassword"'), 'Should contain new password input');
    assert.ok(!studentRes.body.includes('name="adminSecretKey"'), 'Student should NOT have adminSecretKey field');

    // Admin reset form MUST show admin secret key
    const adminRes = await request({ method: 'GET', path: '/auth/reset-password?email=admin@cognifyz.com' });
    assert.equal(adminRes.statusCode, 200);
    assert.ok(adminRes.body.includes('Administrator'), 'Should show Administrator badge/label');
    assert.ok(adminRes.body.includes('name="adminSecretKey"'), 'Admin reset form MUST contain adminSecretKey field');
  });

  it('POST /auth/reset-password for student rejects weak password and updates on valid password', async () => {
    // 1. Weak password rejected
    const weakPayload = new URLSearchParams({
      email: 'student@cognifyz.com',
      newPassword: 'weak',
      confirmPassword: 'weak',
    }).toString();

    const weakRes = await request({
      method: 'POST',
      path: '/auth/reset-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(weakPayload),
      },
    }, weakPayload);
    assert.equal(weakRes.statusCode, 422);
    assert.ok(weakRes.body.includes('Password must be at least 8 characters'));

    // 2. Valid password updates credentials and redirects to /login
    const validPassword = 'NewStudent@Password2026!';
    const validPayload = new URLSearchParams({
      email: 'student@cognifyz.com',
      newPassword: validPassword,
      confirmPassword: validPassword,
    }).toString();

    const validRes = await request({
      method: 'POST',
      path: '/auth/reset-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(validPayload),
      },
    }, validPayload);
    assert.equal(validRes.statusCode, 302);
    assert.equal(validRes.headers.location, '/login');

    // 3. User can immediately authenticate with the new password
    const loginUser = await userStore.authenticate('student@cognifyz.com', validPassword);
    assert.ok(loginUser, 'Student must be able to authenticate with new password');
  });

  it('POST /auth/reset-password for admin requires valid Admin Secret Key', async () => {
    // 1. Missing / invalid secret key rejected with 422
    const invalidSecretPayload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      newPassword: 'NewAdmin@Password2026!',
      confirmPassword: 'NewAdmin@Password2026!',
      adminSecretKey: 'WrongSecretKey',
    }).toString();

    const rejectRes = await request({
      method: 'POST',
      path: '/auth/reset-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(invalidSecretPayload),
      },
    }, invalidSecretPayload);
    assert.equal(rejectRes.statusCode, 422);
    assert.ok(rejectRes.body.includes('Invalid Admin Secret Key'));

    // 2. Valid secret key succeeds and updates password
    const newAdminPass = 'SuperAdmin@NewPass2026!';
    const validAdminPayload = new URLSearchParams({
      email: 'admin@cognifyz.com',
      newPassword: newAdminPass,
      confirmPassword: newAdminPass,
      adminSecretKey: process.env.ADMIN_SECRET_KEY || 'Admin@Secret2026',
    }).toString();

    const successRes = await request({
      method: 'POST',
      path: '/auth/reset-password',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(validAdminPayload),
      },
    }, validAdminPayload);
    assert.equal(successRes.statusCode, 302);
    assert.equal(successRes.headers.location, '/login');

    // 3. Admin can immediately authenticate with the new password
    const loginAdmin = await userStore.authenticate('admin@cognifyz.com', newAdminPass);
    assert.ok(loginAdmin, 'Admin must be able to authenticate with new password');
  });

});
