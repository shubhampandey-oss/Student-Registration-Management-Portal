'use strict';

/**
 * src/controllers/auth.controller.js
 * Controller handling user authentication, session creation,
 * registration, login, logout, and current user profile inspection.
 */

const bcrypt       = require('bcrypt');
const userStore    = require('../models/user.store');
const studentStore = require('../models/student.store');
const cacheService = require('../services/cache.service');
const { evaluatePasswordStrength } = require('../utils/validation');

/**
 * GET /auth/login
 * Displays dual user / admin login interface
 */
exports.getLogin = (req, res) => {
  const portal = (req.query.portal === 'admin' || req.query.tab === 'admin') ? 'admin' : 'student';
  const defaultReturnUrl = portal === 'admin' ? '/students' : '/auth/dashboard';
  const returnUrl = req.query.returnUrl || defaultReturnUrl;

  res.render('pages/login', {
    title:     portal === 'admin' ? 'Administrator Sign In — Student Portal' : 'Student Sign In — Student Portal',
    portal,
    returnUrl,
    errors:    [],
    old:       {},
    flash:     res.locals.flash,
  });
};

/**
 * POST /auth/login
 * Verifies credentials, initializes session on success
 */
exports.postLogin = async (req, res) => {
  const { email, password, returnUrl, portal } = req.body;
  const currentPortal = portal === 'admin' ? 'admin' : 'student';
  const defaultTarget = currentPortal === 'admin' ? '/students' : '/auth/dashboard';
  const targetUrl = (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//'))
    ? returnUrl
    : defaultTarget;

  const cleanEmail = (typeof email === 'string') ? email.toLowerCase().trim() : '';
  const cleanPassword = (typeof password === 'string') ? password : '';

  const errors = [];
  if (!cleanEmail) {
    errors.push({ field: 'email', msg: 'Email address is required.' });
  }
  if (!cleanPassword || !cleanPassword.trim()) {
    errors.push({ field: 'password', msg: 'Password is required.' });
  }

  if (errors.length > 0) {
    return res.status(422).render('pages/login', {
      title:     currentPortal === 'admin' ? 'Administrator Sign In — Student Portal' : 'Student Sign In — Student Portal',
      portal:    currentPortal,
      returnUrl: targetUrl,
      errors,
      old:       { email },
      flash:     null,
    });
  }

  try {
    // 1. Look up user by lowercase trimmed email
    const rawUser = userStore.findByEmail(cleanEmail);

    if (!rawUser) {
      console.warn(`[AUTH] Login failed: User not found for email "${cleanEmail}" on ${currentPortal.toUpperCase()} portal.`);
      return res.status(401).render('pages/login', {
        title:     currentPortal === 'admin' ? 'Administrator Sign In — Student Portal' : 'Student Sign In — Student Portal',
        portal:    currentPortal,
        returnUrl: targetUrl,
        errors:    [{ field: 'auth', msg: 'Invalid email address or password. Please try again.' }],
        old:       { email },
        flash:     null,
      });
    }

    // 2. Properly verify hashed password with bcrypt.compare()
    const isPasswordValid = await bcrypt.compare(cleanPassword, rawUser.passwordHash);
    if (!isPasswordValid) {
      console.warn(`[AUTH] Login failed: Password mismatch for user "${cleanEmail}" on ${currentPortal.toUpperCase()} portal.`);
      return res.status(401).render('pages/login', {
        title:     currentPortal === 'admin' ? 'Administrator Sign In — Student Portal' : 'Student Sign In — Student Portal',
        portal:    currentPortal,
        returnUrl: targetUrl,
        errors:    [{ field: 'auth', msg: 'Invalid email address or password. Please try again.' }],
        old:       { email },
        flash:     null,
      });
    }

    // 3. Check role authorization when logging in through Admin Portal
    if (currentPortal === 'admin' && rawUser.role === 'student') {
      console.warn(`[AUTH] Login failed: Role unauthorized — user "${cleanEmail}" is a student attempting Admin Portal login.`);
      return res.status(401).render('pages/login', {
        title:     'Administrator Sign In — Student Portal',
        portal:    'admin',
        returnUrl: targetUrl,
        errors:    [{ field: 'auth', msg: 'This account is a student. Please sign in via the Student Portal.' }],
        old:       { email },
        flash:     null,
      });
    }

    console.log(`[AUTH] Successful login for "${rawUser.email}" [role=${rawUser.role}] on ${currentPortal.toUpperCase()} portal.`);

    // 4. Save user in session (sanitized)
    const user = {
      id:    rawUser.id,
      name:  rawUser.name,
      email: rawUser.email,
      role:  rawUser.role,
    };
    req.session.user = user;

    if (typeof req.setFlash === 'function') {
      req.setFlash('success', `Welcome back, ${user.name}! You are signed in as ${user.role}.`);
    } else {
      req.session.flash = {
        type: 'success',
        message: `Welcome back, ${user.name}! You are signed in as ${user.role}.`,
      };
    }

    // Role-tailored destination:
    // Admin goes directly to /students (to inspect registered students)
    // Student goes directly to /auth/dashboard (their student workspace)
    let finalTarget = targetUrl;
    if (user.role === 'admin') {
      finalTarget = (targetUrl && targetUrl !== '/auth/dashboard') ? targetUrl : '/students';
    } else {
      finalTarget = (targetUrl && targetUrl !== '/students') ? targetUrl : '/auth/dashboard';
    }

    return req.session.save(() => {
      res.redirect(finalTarget);
    });
  } catch (err) {
    console.error('[AUTH CONTROLLER] Login error:', err.message);
    return res.status(500).render('pages/error', {
      title:   'Sign In Error',
      code:    500,
      message: 'An unexpected error occurred during login. Please try again.',
    });
  }
};

/**
 * GET /auth/register
 * Displays user account creation interface with Student/Admin tabs
 */
exports.getRegister = (req, res) => {
  const role = (req.query.role === 'admin' || req.query.tab === 'admin') ? 'admin' : 'student';
  res.render('pages/user-register', {
    title:  role === 'admin' ? 'Create Administrator Account — Student Portal' : 'Create Account — Student Portal',
    role,
    errors: [],
    old:    {},
    flash:  res.locals.flash,
  });
};

/**
 * POST /auth/register
 * Validates inputs, creates new user, logs them into session or redirects admin to login
 */
exports.postRegister = async (req, res) => {
  const { name, email, password, confirmPassword, role, adminSecretKey } = req.body;
  const currentRole = (role === 'admin') ? 'admin' : 'student';
  const errors = [];

  // 1. Name validation
  if (!name || !name.trim()) {
    errors.push({ field: 'name', msg: 'Full name is required.' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', msg: 'Name must be at least 2 characters long.' });
  }

  // 2. Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !email.trim()) {
    errors.push({ field: 'email', msg: 'Email address is required.' });
  } else if (!emailRegex.test(email.trim())) {
    errors.push({ field: 'email', msg: 'Please provide a valid email address.' });
  } else {
    const existing = userStore.findByEmail(email.trim());
    if (existing) {
      errors.push({ field: 'email', msg: 'An account with this email address already exists.' });
    }
  }

  // 3. Password strength & confirmation
  const trimmedPassword = (typeof password === 'string') ? password.trim() : '';
  const trimmedConfirm = (typeof confirmPassword === 'string') ? confirmPassword.trim() : '';

  if (!trimmedPassword) {
    errors.push({ field: 'password', msg: 'Password is required.' });
  } else {
    const strength = evaluatePasswordStrength(trimmedPassword);
    if (!strength.isValid) {
      errors.push({
        field: 'password',
        msg: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.',
      });
    }
  }

  if (trimmedPassword !== trimmedConfirm) {
    errors.push({ field: 'confirmPassword', msg: 'Passwords do not match.' });
  }

  // 4. Admin Secret Key verification for Administrator registration
  const validAdminSecret = process.env.ADMIN_SECRET_KEY || 'Admin@Secret2026';
  if (currentRole === 'admin') {
    const trimmedSecret = (typeof adminSecretKey === 'string') ? adminSecretKey.trim() : '';
    if (!trimmedSecret || trimmedSecret !== validAdminSecret) {
      errors.push({ field: 'adminSecretKey', msg: 'Invalid Admin Secret Key' });
    }
  }

  if (errors.length > 0) {
    return res.status(422).render('pages/user-register', {
      title:  currentRole === 'admin' ? 'Create Administrator Account — Student Portal' : 'Create Account — Student Portal',
      role:   currentRole,
      errors,
      old:    { name, email, password: trimmedPassword, confirmPassword: trimmedConfirm, role: currentRole, adminSecretKey },
      flash:  null,
    });
  }

  try {
    const newUser = await userStore.create({
      name:     name.trim(),
      email:    email.trim(),
      password: trimmedPassword,
      role:     currentRole,
    });

    // Post-Registration flow:
    // If Admin: redirect directly to /login?tab=admin
    if (currentRole === 'admin') {
      if (typeof req.setFlash === 'function') {
        req.setFlash('success', 'Administrator account created successfully! Please sign in with your credentials.');
      } else if (req.session) {
        req.session.flash = {
          type: 'success',
          message: 'Administrator account created successfully! Please sign in with your credentials.',
        };
      }
      return req.session.save(() => {
        res.redirect('/login?tab=admin');
      });
    }

    // If Student: log the user into session immediately and redirect to dashboard
    req.session.user = {
      id:    newUser.id,
      name:  newUser.name,
      email: newUser.email,
      role:  newUser.role,
    };

    if (typeof req.setFlash === 'function') {
      req.setFlash('success', `Account created successfully! Welcome to the portal, ${newUser.name}.`);
    } else {
      req.session.flash = {
        type: 'success',
        message: `Account created successfully! Welcome to the portal, ${newUser.name}.`,
      };
    }

    return req.session.save(() => {
      res.redirect('/auth/dashboard');
    });
  } catch (err) {
    console.error('[AUTH CONTROLLER] Registration error:', err.message);
    return res.status(500).render('pages/error', {
      title:   'Registration Error',
      code:    500,
      message: 'Failed to create user account. Please try again.',
    });
  }
};

/**
 * GET /auth/logout & POST /auth/logout
 * Destroys user session and redirects to home
 */
exports.logout = (req, res) => {
  const userName = req.session && req.session.user ? req.session.user.name : null;

  req.session.destroy(err => {
    if (err) {
      console.error('[AUTH CONTROLLER] Logout error:', err.message);
    }
    res.clearCookie('connect.sid');
    // Render home with signout note or redirect
    res.redirect('/?logged_out=1');
  });
};

/**
 * GET /auth/me
 * JSON endpoint returning authenticated session state
 */
exports.getMe = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      success: true,
      authenticated: true,
      user: req.session.user,
    });
  }
  return res.json({
    success: true,
    authenticated: false,
    user: null,
  });
};

/**
 * GET /auth/dashboard
 * Protected user dashboard
 */
exports.getDashboard = (req, res) => {
  res.render('pages/dashboard', {
    title: 'User Dashboard — Student Portal',
    user:  req.session.user,
    flash: res.locals.flash,
  });
};

/**
 * GET /auth/admin
 * Protected administrator console
 */
exports.getAdmin = (req, res) => {
  const users = userStore.getAll();
  const students = studentStore.getAll();
  res.render('pages/admin', {
    title:    'Administrator Console — Student Portal',
    user:     req.session.user,
    users,
    students,
    flash:    res.locals.flash,
  });
};

/**
 * GET /auth/security
 * Displays security status and cache analytics
 */
exports.getSecurityStatus = (req, res) => {
  const cacheStats = cacheService.getStats();
  res.render('pages/security-status', {
    title:      'Security & Diagnostics — Student Portal',
    user:       req.session.user,
    cacheStats,
    flash:      res.locals.flash,
  });
};

/**
 * POST /auth/security/flush-cache
 * Flushes all active cache items
 */
exports.postFlushCache = (req, res) => {
  cacheService.flush();
  if (typeof req.setFlash === 'function') {
    req.setFlash('success', 'In-memory cache successfully flushed.');
  } else if (req.session) {
    req.session.flash = { type: 'success', message: 'In-memory cache successfully flushed.' };
  }
  res.redirect('/auth/security');
};

/**
 * GET /auth/forgot-password
 * Displays email lookup form for password recovery
 */
exports.getForgotPassword = (req, res) => {
  res.render('pages/forgot-password', {
    title:  'Forgot Password — Student Portal',
    errors: [],
    old:    {},
    flash:  res.locals.flash,
  });
};

/**
 * POST /auth/forgot-password
 * Verifies email exists in database, redirects to reset page
 */
exports.postForgotPassword = (req, res) => {
  const { email } = req.body;
  const cleanEmail = (typeof email === 'string') ? email.toLowerCase().trim() : '';
  const errors = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail) {
    errors.push({ field: 'email', msg: 'Email address is required.' });
  } else if (!emailRegex.test(cleanEmail)) {
    errors.push({ field: 'email', msg: 'Please enter a valid email address.' });
  } else {
    const user = userStore.findByEmail(cleanEmail);
    if (!user) {
      errors.push({ field: 'email', msg: 'No registered account found with this email address.' });
    }
  }

  if (errors.length > 0) {
    return res.status(422).render('pages/forgot-password', {
      title:  'Forgot Password — Student Portal',
      errors,
      old:    { email: cleanEmail },
      flash:  null,
    });
  }

  return res.redirect(`/auth/reset-password?email=${encodeURIComponent(cleanEmail)}`);
};

/**
 * GET /auth/reset-password
 * Displays password reset form (with conditional Admin Secret Key if user is admin)
 */
exports.getResetPassword = (req, res) => {
  const emailParam = (typeof req.query.email === 'string') ? req.query.email.toLowerCase().trim() : '';

  if (!emailParam) {
    if (typeof req.setFlash === 'function') {
      req.setFlash('error', 'Please enter your registered email address first.');
    } else if (req.session) {
      req.session.flash = { type: 'error', message: 'Please enter your registered email address first.' };
    }
    return res.redirect('/auth/forgot-password');
  }

  const user = userStore.findByEmail(emailParam);
  if (!user) {
    return res.status(404).render('pages/forgot-password', {
      title:  'Forgot Password — Student Portal',
      errors: [{ field: 'email', msg: 'No registered account found with this email address.' }],
      old:    { email: emailParam },
      flash:  null,
    });
  }

  res.render('pages/reset-password', {
    title:    'Reset Password — Student Portal',
    email:    user.email,
    userRole: user.role,
    errors:   [],
    old:      { email: user.email },
    flash:    res.locals.flash,
  });
};

/**
 * POST /auth/reset-password
 * Validates new password criteria, verifies admin secret key if admin, updates hash, redirects to login
 */
exports.postResetPassword = async (req, res) => {
  const { email, newPassword, confirmPassword, adminSecretKey } = req.body;
  const cleanEmail = (typeof email === 'string') ? email.toLowerCase().trim() : '';
  const errors = [];

  const user = userStore.findByEmail(cleanEmail);
  if (!user) {
    errors.push({ field: 'email', msg: 'No account found with this email address.' });
    return res.status(404).render('pages/forgot-password', {
      title:  'Forgot Password — Student Portal',
      errors,
      old:    { email: cleanEmail },
      flash:  null,
    });
  }

  const trimmedPassword = (typeof newPassword === 'string') ? newPassword.trim() : '';
  const trimmedConfirm = (typeof confirmPassword === 'string') ? confirmPassword.trim() : '';

  // 1. Password security criteria
  if (!trimmedPassword) {
    errors.push({ field: 'newPassword', msg: 'New password is required.' });
  } else {
    const strength = evaluatePasswordStrength(trimmedPassword);
    if (!strength.isValid) {
      errors.push({
        field: 'newPassword',
        msg: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.',
      });
    }
  }

  // 2. Password matching
  if (trimmedPassword !== trimmedConfirm) {
    errors.push({ field: 'confirmPassword', msg: 'Passwords do not match.' });
  }

  // 3. Admin Secret Key authorization if account is admin
  if (user.role === 'admin') {
    const validAdminSecret = process.env.ADMIN_SECRET_KEY || 'Admin@Secret2026';
    const trimmedSecret = (typeof adminSecretKey === 'string') ? adminSecretKey.trim() : '';
    if (!trimmedSecret || trimmedSecret !== validAdminSecret) {
      errors.push({ field: 'adminSecretKey', msg: 'Invalid Admin Secret Key' });
    }
  }

  if (errors.length > 0) {
    return res.status(422).render('pages/reset-password', {
      title:    'Reset Password — Student Portal',
      email:    user.email,
      userRole: user.role,
      errors,
      old:      { email: user.email, newPassword: trimmedPassword, confirmPassword: trimmedConfirm, adminSecretKey },
      flash:    null,
    });
  }

  try {
    await userStore.updatePassword(user.email, trimmedPassword);

    const successMessage = 'Password reset successful! Please log in with your new credentials.';
    if (typeof req.setFlash === 'function') {
      req.setFlash('success', successMessage);
    } else if (req.session) {
      req.session.flash = { type: 'success', message: successMessage };
    }

    return req.session.save(() => {
      res.redirect('/login');
    });
  } catch (err) {
    console.error('[AUTH] Password reset error:', err.message);
    return res.status(500).render('pages/error', {
      title:   'Password Reset Error',
      code:    500,
      message: 'Failed to reset password. Please try again.',
    });
  }
};


