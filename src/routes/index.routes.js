'use strict';

/**
 * src/routes/index.routes.js
 * Top-level routes: landing page, dashboard redirect.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/index.controller');

// GET / → Landing / Home page
router.get('/', controller.getHome);

// Public legal & informative pages
router.get('/privacy', controller.getPrivacy);
router.get('/terms', controller.getTerms);
router.get('/contact', controller.getContact);
router.post('/contact', controller.postContact);

// Health check endpoint for cloud monitoring & Render deployment
router.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));

// Authentication aliases with query parameter preservation
router.get('/login', (req, res) => {
  if (res.locals.flash && req.session) {
    req.session.flash = res.locals.flash;
  }
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/auth/login${qs}`);
});
router.get('/register', (req, res) => {
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/auth/register${qs}`);
});
router.get('/signup', (req, res) => {
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/auth/register${qs}`);
});

router.get('/forgot-password', (req, res) => {
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/auth/forgot-password${qs}`);
});

router.get('/reset-password', (req, res) => {
  const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  res.redirect(`/auth/reset-password${qs}`);
});

// Student registration alias routes protected by isAuthenticated
const studentController = require('../controllers/student.controller');
const { requireAuth, isAuthenticated } = require('../middleware/auth.middleware');

router.get('/register-student',  isAuthenticated, studentController.getRegisterForm);
router.post('/register-student', isAuthenticated, studentController.postRegister);

// Root account deletion routes
const authController = require('../controllers/auth.controller');
router.post('/account/delete', requireAuth, authController.deleteAccount);
router.delete('/account',      requireAuth, authController.deleteAccount);

// Developer API documentation endpoints (accessible directly without UI exposure)
const apiController = require('../controllers/api.controller');
router.get('/api-docs', apiController.getApiDocs);
router.get('/docs',     apiController.getApiDocs);

module.exports = router;
