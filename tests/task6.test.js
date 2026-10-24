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
    await userStore.updatePassword('admin@cognifyz.com', 'Admin@12345');
    await userStore.updatePassword('student@cognifyz.com', 'Student@12345');
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

  it('GET /auth/register — returns 200 with registration form, tabs toggle, and terms agreement checkbox', async () => {
    const res = await request({ method: 'GET', path: '/auth/register' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Create Account'), 'Should display Create Account header');
    assert.ok(res.body.includes('name="name"'), 'Should contain name input');
    assert.ok(res.body.includes('Student Account'), 'Should contain Student Account tab');
    assert.ok(res.body.includes('Admin Account'), 'Should contain Admin Account tab');
    assert.ok(!res.body.includes('name="adminSecretKey"'), 'Admin Secret Key field must be completely removed');
    assert.ok(!res.body.includes('<select name="role"'), 'Role selection dropdown must not exist');
    assert.ok(res.body.includes('name="agreeTerms"'), 'Registration form must contain agreeTerms checkbox');
    assert.ok(res.body.includes('required'), 'agreeTerms checkbox must have required attribute');
    assert.ok(res.body.includes('/terms'), 'Must contain link to /terms');
    assert.ok(res.body.includes('/privacy'), 'Must contain link to /privacy');
  });

  it('POST /auth/register — rejects registration when terms agreement checkbox is not checked', async () => {
    const payload = new URLSearchParams({
      name: 'No Agreement User',
      email: `noagree_${Date.now()}@example.com`,
      role: 'student',
      password: 'ValidPassword@2026',
      confirmPassword: 'ValidPassword@2026',
      // agreeTerms omitted
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 422, 'Must reject registration with 422 if terms agreement is missing');
    assert.ok(
      res.body.includes('You must agree to the Terms & Conditions and Privacy Policy'),
      'Must display clear terms validation error'
    );
  });

  it('POST /auth/register — directly creates admin account under Admin tab with agreement checked', async () => {
    const testEmail = `validadmin_${Date.now()}@example.com`;
    const payload = new URLSearchParams({
      name: 'Direct Admin User',
      email: testEmail,
      role: 'admin',
      password: 'ValidAdminPass@2026',
      confirmPassword: 'ValidAdminPass@2026',
      agreeTerms: 'on',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/auth/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 302, 'Should succeed with 302 redirect without any secret key');
    assert.equal(res.headers.location, '/login?tab=admin', 'Must redirect to /login?tab=admin');
    const createdUser = userStore.findByEmail(testEmail);
    assert.ok(createdUser, 'Admin user account should be created in database');
    assert.equal(createdUser.role, 'admin', 'Role must directly be admin');
  });

  it('POST /auth/register — rejects invalid password and returns synchronized error message', async () => {
    const payload = new URLSearchParams({
      name: 'Weak Password User',
      email: 'weakpass@example.com',
      role: 'student',
      password: 'weakpassword',
      confirmPassword: 'weakpassword',
      agreeTerms: 'on',
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
      agreeTerms: 'on',
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
        agreeTerms: 'on',
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

  it('GET /privacy — renders Privacy Policy page with dark theme container and required sections', async () => {
    const res = await request({ method: 'GET', path: '/privacy' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Privacy Policy'), 'Must contain Privacy Policy title');
    assert.ok(res.body.includes('Information We Collect'), 'Must contain Information We Collect');
    assert.ok(res.body.includes('How We Use Data'), 'Must contain How We Use Data');
    assert.ok(res.body.includes('Data Security & Storage') || res.body.includes('Data Security &amp; Storage'), 'Must contain Data Security & Storage');
    assert.ok(res.body.includes('User Rights & Account Deletion') || res.body.includes('User Rights &amp; Account Deletion'), 'Must contain User Rights');
    assert.ok(res.body.includes('Contact Support'), 'Must contain Contact Support');
    assert.ok(res.body.includes('max-width: 900px') || res.body.includes('max-width:900px'), 'Must be in centered container with max-width 900px');
  });

  it('GET /terms — renders Terms & Conditions page with dark theme container and required sections', async () => {
    const res = await request({ method: 'GET', path: '/terms' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Terms & Conditions') || res.body.includes('Terms &amp; Conditions'), 'Must contain Terms & Conditions title');
    assert.ok(res.body.includes('Acceptance of Terms'), 'Must contain Acceptance of Terms');
    assert.ok(res.body.includes('User Responsibilities & Credential Confidentiality') || res.body.includes('User Responsibilities &amp; Credential Confidentiality'), 'Must contain User Responsibilities');
    assert.ok(res.body.includes('Role Access Privileges'), 'Must contain Role Access Privileges');
    assert.ok(res.body.includes('Acceptable Use Policy'), 'Must contain Acceptable Use Policy');
    assert.ok(res.body.includes('Account Termination & Disclaimers') || res.body.includes('Account Termination &amp; Disclaimers'), 'Must contain Account Termination');
    assert.ok(res.body.includes('max-width: 900px') || res.body.includes('max-width:900px'), 'Must be in centered container with max-width 900px');
  });

  it('Footer contains direct links to /privacy and /terms', async () => {
    const res = await request({ method: 'GET', path: '/' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('href="/privacy"'), 'Footer must contain link to /privacy');
    assert.ok(res.body.includes('href="/terms"'), 'Footer must contain link to /terms');
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

  it('GET /auth/reset-password shows password fields and NO admin secret key for both roles', async () => {
    // Student reset form should NOT show admin secret key
    const studentRes = await request({ method: 'GET', path: '/auth/reset-password?email=student@cognifyz.com' });
    assert.equal(studentRes.statusCode, 200);
    assert.ok(studentRes.body.includes('Student'), 'Should show Student badge/label');
    assert.ok(studentRes.body.includes('name="newPassword"'), 'Should contain new password input');
    assert.ok(!studentRes.body.includes('name="adminSecretKey"'), 'Student should NOT have adminSecretKey field');

    // Admin reset form also should NOT show admin secret key
    const adminRes = await request({ method: 'GET', path: '/auth/reset-password?email=admin@cognifyz.com' });
    assert.equal(adminRes.statusCode, 200);
    assert.ok(adminRes.body.includes('Administrator'), 'Should show Administrator badge/label');
    assert.ok(adminRes.body.includes('name="newPassword"'), 'Should contain new password input');
    assert.ok(!adminRes.body.includes('name="adminSecretKey"'), 'Admin reset form MUST NOT contain adminSecretKey field');
  });

  it('POST /auth/reset-password for student rejects weak password and updates on valid password', async () => {
    const testEmail = `rststudent_${Date.now()}@example.com`;
    await userStore.create({
      name: 'Reset Student User',
      email: testEmail,
      password: 'OldPassword@123',
      role: 'student',
    });

    // 1. Weak password rejected
    const weakPayload = new URLSearchParams({
      email: testEmail,
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
      email: testEmail,
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
    const loginUser = await userStore.authenticate(testEmail, validPassword);
    assert.ok(loginUser, 'Student must be able to authenticate with new password');
  });

  it('POST /auth/reset-password for admin resets password directly without requiring Admin Secret Key', async () => {
    const testAdminEmail = `rstadmin_${Date.now()}@example.com`;
    await userStore.create({
      name: 'Reset Admin User',
      email: testAdminEmail,
      password: 'OldAdminPassword@123',
      role: 'admin',
    });

    // Directly submit new password without any adminSecretKey
    const newAdminPass = 'SuperAdmin@NewPass2026!';
    const validAdminPayload = new URLSearchParams({
      email: testAdminEmail,
      newPassword: newAdminPass,
      confirmPassword: newAdminPass,
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

    // Admin can immediately authenticate with the new password
    const loginAdmin = await userStore.authenticate(testAdminEmail, newAdminPass);
    assert.ok(loginAdmin, 'Admin must be able to authenticate with new password');
  });

  // ── Account Deletion Feature ──────────────────────────────────
  it('GET /auth/dashboard and /auth/admin contain Delete My Account button and modal', async () => {
    // 1. Student dashboard check
    const studentPayload = new URLSearchParams({
      portal: 'student',
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
    const dashRes = await request({
      method: 'GET',
      path: '/auth/dashboard',
      headers: { 'Cookie': studentCookie },
    });
    assert.equal(dashRes.statusCode, 200);
    assert.ok(dashRes.body.includes('Delete My Account'), 'Student dashboard must contain Delete My Account button');
    assert.ok(dashRes.body.includes('deleteAccountModal'), 'Student dashboard must contain delete modal');

    // 2. Admin dashboard check
    const adminPayload = new URLSearchParams({
      portal: 'admin',
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
    assert.equal(adminRes.statusCode, 200);
    assert.ok(adminRes.body.includes('Delete My Account'), 'Admin console must contain Delete My Account button');
    assert.ok(adminRes.body.includes('deleteAdminAccountModal'), 'Admin console must contain admin delete modal');
  });

  it('POST /account/delete requires authentication', async () => {
    const res = await request({
      method: 'POST',
      path: '/account/delete',
    });
    assert.equal(res.statusCode, 302, 'Unauthenticated account deletion request must redirect');
    assert.ok(res.headers.location.includes('/auth/login'));
  });

  it('POST /account/delete deletes student user, linked student records, destroys session, and redirects to home', async () => {
    const testEmail = `delstudent_${Date.now()}@example.com`;
    const password = 'DeleteMePass@123';

    // 1. Create student user
    await userStore.create({
      name: 'To Be Deleted Student',
      email: testEmail,
      password,
      role: 'student',
    });

    // 2. Create linked student record
    studentStore.add({
      name: 'To Be Deleted Student',
      email: testEmail,
      phone: '9888877777',
      course: 'Computer Science',
      dob: '2001-01-01',
      gender: 'Male',
      year: '2nd Year',
    });

    // Verify both exist before deletion
    assert.ok(userStore.findByEmail(testEmail), 'User record must exist prior to deletion');
    assert.ok(studentStore.getAll().some(s => s.email.toLowerCase() === testEmail.toLowerCase()), 'Student record must exist prior to deletion');

    // 3. Log in to establish session
    const loginPayload = new URLSearchParams({
      portal: 'student',
      email: testEmail,
      password,
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);

    const cookie = parseCookies(loginRes);

    // 4. Submit account deletion request
    const delRes = await request({
      method: 'POST',
      path: '/account/delete',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    assert.equal(delRes.statusCode, 302, 'Account deletion should redirect');
    assert.ok(delRes.headers.location.startsWith('/?deleted='), 'Must redirect to landing page with deleted flag');

    // 5. Verify records removed from database
    assert.equal(userStore.findByEmail(testEmail), null, 'User record must be permanently removed from database');
    assert.ok(!studentStore.getAll().some(s => s.email.toLowerCase() === testEmail.toLowerCase()), 'Linked student record must be deleted');

    // 6. Verify landing page renders success message
    const homeRes = await request({
      method: 'GET',
      path: delRes.headers.location,
    });
    assert.ok(
      homeRes.body.includes('Your account has been permanently deleted') ||
      homeRes.body.includes('Your account has been deleted successfully.'),
      'Landing page must show deletion banner'
    );
  });

  it('POST /account/delete deletes administrator user and destroys session', async () => {
    const adminEmail = `deladmin_${Date.now()}@example.com`;
    const password = 'DeleteAdmin@123';

    // 1. Create admin user
    await userStore.create({
      name: 'To Be Deleted Admin',
      email: adminEmail,
      password,
      role: 'admin',
    });

    assert.ok(userStore.findByEmail(adminEmail), 'Admin user must exist');

    // 2. Log in
    const loginPayload = new URLSearchParams({
      portal: 'admin',
      email: adminEmail,
      password,
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);

    const cookie = parseCookies(loginRes);

    // 3. Delete admin account
    const delRes = await request({
      method: 'POST',
      path: '/account/delete',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    assert.equal(delRes.statusCode, 302);
    assert.ok(delRes.headers.location.startsWith('/?deleted='));

    // 4. Verify admin user is gone from database
    assert.equal(userStore.findByEmail(adminEmail), null, 'Admin user must be permanently removed from database');
  });

  // ── Student Registration Authentication Protection ──────────────
  it('GET /students/register — unauthenticated guest is redirected to /login with flash warning and returnTo session', async () => {
    const res = await request({
      method: 'GET',
      path: '/students/register',
    });

    assert.equal(res.statusCode, 302, 'Unauthenticated GET /students/register must return 302 redirect');
    assert.equal(res.headers.location, '/login', 'Must redirect directly to /login');

    const cookie = parseCookies(res);
    assert.ok(cookie, 'Must set session cookie containing flash and returnTo');

    // Follow redirect to /login and verify warning flash
    const loginRes = await request({
      method: 'GET',
      path: '/login',
      headers: { 'Cookie': cookie },
    });
    assert.equal(loginRes.statusCode, 302, '/login redirects to /auth/login');
    const authLoginRes = await request({
      method: 'GET',
      path: loginRes.headers.location,
      headers: { 'Cookie': cookie },
    });
    assert.equal(authLoginRes.statusCode, 200);
    assert.ok(authLoginRes.body.includes('Please sign in to register a student record.'), 'Flash warning must be displayed');
  });

  it('POST /students/register — unauthenticated guest is redirected to /login', async () => {
    const payload = new URLSearchParams({
      name: 'Test Student',
      email: 'testauth@example.com',
      course: 'Computer Science',
      phone: '9876543210',
    }).toString();

    const res = await request({
      method: 'POST',
      path: '/students/register',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, payload);

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, '/login');
  });

  it('GET and POST /register-student — unauthenticated guest is redirected to /login', async () => {
    const getRes = await request({
      method: 'GET',
      path: '/register-student',
    });
    assert.equal(getRes.statusCode, 302);
    assert.equal(getRes.headers.location, '/login');

    const postRes = await request({
      method: 'POST',
      path: '/register-student',
    });
    assert.equal(postRes.statusCode, 302);
    assert.equal(postRes.headers.location, '/login');
  });

  it('Upon successful login, user is redirected straight back to saved returnTo destination', async () => {
    // 1. Visit /students/register unauthenticated to establish session with returnTo
    const accessRes = await request({
      method: 'GET',
      path: '/students/register',
    });
    const sessionCookie = parseCookies(accessRes);

    // 2. Log in with that session cookie
    const loginPayload = new URLSearchParams({
      portal: 'student',
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);

    assert.equal(loginRes.statusCode, 302);
    assert.equal(loginRes.headers.location, '/students/register', 'Must redirect back to saved returnTo (/students/register)');

    // 3. Access /students/register with authenticated session -> should succeed (200)
    const regRes = await request({
      method: 'GET',
      path: '/students/register',
      headers: { 'Cookie': sessionCookie },
    });
    assert.equal(regRes.statusCode, 200, 'Authenticated user must be granted access');
    assert.ok(regRes.body.includes('Student Registration'), 'Must render registration page');
  });

  it('Navbar conditionally shows "+ Register Student" only when user is logged in', async () => {
    // 1. Unauthenticated request to home page
    const guestRes = await request({
      method: 'GET',
      path: '/',
    });
    assert.equal(guestRes.statusCode, 200);
    assert.ok(!guestRes.body.includes('id="navRegisterStudentBtn"'), 'Guest navbar must NOT contain register student button');
    assert.ok(!guestRes.body.includes('+ Register Student'), 'Guest navbar must NOT show + Register Student text');

    // 2. Authenticate as student
    const loginPayload = new URLSearchParams({
      portal: 'student',
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);
    const authCookie = parseCookies(loginRes);

    // 3. Authenticated request to home page
    const authHomeRes = await request({
      method: 'GET',
      path: '/',
      headers: { 'Cookie': authCookie },
    });
    assert.equal(authHomeRes.statusCode, 200);
    assert.ok(authHomeRes.body.includes('id="navRegisterStudentBtn"'), 'Logged-in navbar must display Register Student button');
    assert.ok(authHomeRes.body.includes('+ Register Student'), 'Logged-in navbar must show "+ Register Student"');
  });

  it('POST /students/register — authenticated submission automatically associates user_id and requires no password', async () => {
    // 1. Authenticate as student
    const loginPayload = new URLSearchParams({
      portal: 'student',
      email: 'student@cognifyz.com',
      password: 'Student@12345',
    }).toString();

    const loginRes = await request({
      method: 'POST',
      path: '/auth/login',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
    }, loginPayload);
    const authCookie = parseCookies(loginRes);

    const loggedUser = userStore.findByEmail('student@cognifyz.com');
    assert.ok(loggedUser, 'Logged in user must exist');

    // 2. Submit student registration without any password
    const studentEmail = `reg_nopass_${Date.now()}@example.com`;
    const regPayload = new URLSearchParams({
      name: 'Linked Student Record',
      email: studentEmail,
      course: 'Artificial Intelligence',
      year: '2nd Year',
      dob: '2003-06-15',
      gender: 'Female',
      phone: '+91 98765 00123',
    }).toString();

    const submitRes = await request({
      method: 'POST',
      path: '/students/register',
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(regPayload),
      },
    }, regPayload);

    assert.equal(submitRes.statusCode, 302, 'Submission must succeed with 302 redirect');

    // 3. Verify in database
    const savedStudent = studentStore.getAll().find(s => s.email === studentEmail);
    assert.ok(savedStudent, 'Student must be created in store');
    assert.equal(savedStudent.user_id, loggedUser.id, 'Student user_id must match authenticated user id');
    assert.equal(savedStudent.passwordHash, null, 'Student passwordHash must be null');
  });

});
