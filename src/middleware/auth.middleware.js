'use strict';

/**
 * src/middleware/auth.middleware.js
 * Session-based authentication guards and role-based access control.
 */

/**
 * Middleware: Requires the user to be logged in with an active session.
 * Supports both web navigation (redirect to login) and JSON REST APIs (401 response).
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  const isApi = req.path.startsWith('/api') ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to perform this action. Please log in at /auth/login.',
      code: 401,
    });
  }

  if (typeof req.setFlash === 'function') {
    req.setFlash('warning', 'Please sign in to access that page.');
  } else if (req.session) {
    req.session.flash = { type: 'warning', message: 'Please sign in to access that page.' };
  }

  const returnUrl = encodeURIComponent(req.originalUrl || req.url || '/students');
  return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
}

/**
 * Middleware: Requires the authenticated user to hold the 'admin' role.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  const isApi = req.path.startsWith('/api') ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied',
      message: 'Administrator privileges are required for this resource.',
      code: 403,
    });
  }

  if (typeof req.setFlash === 'function') {
    req.setFlash('danger', 'Access denied. Administrator privileges required.');
  } else if (req.session) {
    req.session.flash = { type: 'danger', message: 'Access denied. Administrator privileges required.' };
  }

  return res.redirect('/students');
}

/**
 * Middleware: Redirects already-authenticated users away from login/register pages.
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/students');
  }
  next();
}

/**
 * Middleware: Exposes session user to all views as res.locals.currentUser
 */
function attachCurrentUser(req, res, next) {
  res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
  attachCurrentUser,
};
