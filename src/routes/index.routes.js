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

// Authentication aliases with query parameter preservation
router.get('/login', (req, res) => {
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

// Root account deletion routes
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
router.post('/account/delete', requireAuth, authController.deleteAccount);
router.delete('/account',      requireAuth, authController.deleteAccount);

module.exports = router;
