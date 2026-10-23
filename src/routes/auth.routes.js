'use strict';

/**
 * src/routes/auth.routes.js
 * Routing definitions for user authentication, session management,
 * and security diagnostics.
 */

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/auth.controller');
const {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
} = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Public authentication pages (rate limited against brute force)
router.get('/login',       redirectIfAuthenticated, authController.getLogin);
router.post('/login',      authLimiter, authController.postLogin);

router.get('/register',    redirectIfAuthenticated, authController.getRegister);
router.post('/register',   authLimiter, authController.postRegister);
router.get('/signup',      redirectIfAuthenticated, authController.getRegister);
router.post('/signup',     authLimiter, authController.postRegister);

// Password recovery & reset
router.get('/forgot-password',  redirectIfAuthenticated, authController.getForgotPassword);
router.post('/forgot-password', authLimiter, authController.postForgotPassword);
router.get('/reset-password',   redirectIfAuthenticated, authController.getResetPassword);
router.post('/reset-password',  authLimiter, authController.postResetPassword);

// Session termination
router.get('/logout',    authController.logout);
router.post('/logout',   authController.logout);

// Session inspection
router.get('/me',        authController.getMe);

// Protected routes (Task 6 Authentication & Role Guards)
router.get('/dashboard', requireAuth, authController.getDashboard);
router.get('/admin',     requireAuth, requireAdmin, authController.getAdmin);

// Security & diagnostics (Task 7)
router.get('/security',              requireAuth, authController.getSecurityStatus);
router.post('/security/flush-cache', requireAuth, authController.postFlushCache);

// Account deletion (Task 6 User Management)
router.post('/account/delete', requireAuth, authController.deleteAccount);
router.delete('/account',      requireAuth, authController.deleteAccount);

module.exports = router;
