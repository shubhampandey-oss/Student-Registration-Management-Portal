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

// GET /contact -> renders views/contact.ejs
router.get('/contact', controller.getContact);

// POST /contact -> handles feedback/inquiry message form
router.post('/contact', controller.postContact);

module.exports = router;
