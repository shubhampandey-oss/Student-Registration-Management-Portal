'use strict';

/**
 * src/controllers/auth.controller.js
 * Controller handling user authentication, session creation,
 * registration, login, logout, and current user profile inspection.
 */

const userStore    = require('../models/user.store');
const studentStore = require('../models/student.store');
const cacheService = require('../services/cache.service');
const { evaluatePasswordStrength } = require('../utils/validation');

/**
 * GET /auth/login
 * Displays dual user / admin login interface
 */
exports.getLogin = (req, res) => {
  const portal = req.query.portal === 'admin' ? 'admin' : 'student';
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

  const errors = [];
  if (!email || !email.trim()) {
    errors.push({ field: 'email', msg: 'Email address is required.' });
  }
  if (!password || !password.trim()) {
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
    const user = await userStore.authenticate(email.trim(), password);
    if (!user) {
      return res.status(401).render('pages/login', {
        title:     currentPortal === 'admin' ? 'Administrator Sign In — Student Portal' : 'Student Sign In — Student Portal',
        portal:    currentPortal,
        returnUrl: targetUrl,
        errors:    [{ field: 'auth', msg: 'Invalid email address or password. Please try again.' }],
        old:       { email },
        flash:     null,
      });
    }

    // Save user in session
    req.session.user = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    };

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
 * Displays user account creation interface
 */
exports.getRegister = (req, res) => {
  res.render('pages/user-register', {
    title:  'Create Account — Student Portal',
    errors: [],
    old:    {},
    flash:  res.locals.flash,
  });
};

/**
 * POST /auth/register
 * Validates inputs, creates new user, logs them into session
 */
exports.postRegister = async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;
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

  if (errors.length > 0) {
    return res.status(422).render('pages/user-register', {
      title:  'Create Account — Student Portal',
      errors,
      old:    { name, email, password: trimmedPassword, confirmPassword: trimmedConfirm },
      flash:  null,
    });
  }

  try {
    // Unconditionally assign standard 'student' role for public registrations.
    // Protects administrator privileges from payload manipulation or privilege escalation.
    const userRole = 'student';
    const newUser = await userStore.create({
      name:     name.trim(),
      email:    email.trim(),
      password: trimmedPassword,
      role:     userRole,
    });

    // Log the user into session immediately
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
      res.redirect('/students');
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

