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
router.get('/signup', (req, res) => res.redirect('/auth/register'));

module.exports = router;
