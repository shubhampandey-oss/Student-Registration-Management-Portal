'use strict';

/**
 * src/routes/auth.routes.js
 * Routing definitions for user authentication and session management.
 */

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/auth.controller');
const {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
} = require('../middleware/auth.middleware');

// Public authentication pages (redirect if already logged in)
router.get('/login',     redirectIfAuthenticated, authController.getLogin);
router.post('/login',    authController.postLogin);

router.get('/register',  redirectIfAuthenticated, authController.getRegister);
router.post('/register', authController.postRegister);

// Session termination
router.get('/logout',    authController.logout);
router.post('/logout',   authController.logout);

// Session inspection
router.get('/me',        authController.getMe);

// Protected routes (Task 6 Authentication & Role Guards)
router.get('/dashboard', requireAuth, authController.getDashboard);
router.get('/admin',     requireAuth, requireAdmin, authController.getAdmin);

module.exports = router;
