'use strict';

/**
 * src/routes/pages.js
 * Public static legal & informative pages (Privacy Policy, Terms & Conditions).
 */

const express = require('express');
const router  = express.Router();
const controller = require('../controllers/index.controller');

// GET /privacy -> renders views/privacy.ejs
router.get('/privacy', controller.getPrivacy);

// GET /terms -> renders views/terms.ejs
router.get('/terms', controller.getTerms);

module.exports = router;
