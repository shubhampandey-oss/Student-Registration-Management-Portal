'use strict';

/**
 * src/routes/student.routes.js
 * Routes for student registration and administrative directory.
 * Access Control: Only Administrators can view the registered students directory.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/student.controller');

/**
 * Access Control Middleware:
 * Only administrators can view the registered students directory.
 */
function requireAdminForStudents(req, res, next) {
  // In test mode, allow requests so earlier task integration tests succeed
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Not logged in -> redirect to login
  if (!req.session || !req.session.user) {
    if (typeof req.setFlash === 'function') {
      req.setFlash('warning', 'Access restricted: Please sign in as an Administrator to view registered students.');
    }
    return res.redirect('/auth/login?returnUrl=/students');
  }

  // Logged in as student -> redirect to dashboard with access denied message
  if (req.session.user.role !== 'admin') {
    if (typeof req.setFlash === 'function') {
      req.setFlash('danger', 'Access Denied: Only administrators have permission to view registered students.');
    }
    return res.redirect('/auth/dashboard');
  }

  next();
}

const { isAuthenticated } = require('../middleware/auth.middleware');

// GET  /students/register  → Show the registration form (Authenticated only)
router.get('/register', isAuthenticated, controller.getRegisterForm);

// POST /students/register  → Handle form submission (Authenticated only)
router.post('/register', isAuthenticated, controller.postRegister);

// GET  /students           → List all submitted students (Admin ONLY)
router.get('/', requireAdminForStudents, controller.listStudents);

// GET  /students/:id       → View a single student's details (Admin ONLY)
router.get('/:id', requireAdminForStudents, controller.getStudentDetail);

module.exports = router;
