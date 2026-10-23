'use strict';

/**
 * src/controllers/index.controller.js
 * Handles the landing page / home page.
 */

exports.getHome = (req, res) => {
  let flash = res.locals.flash;
  if (!flash && req.query.logged_out === '1') {
    flash = {
      type: 'success',
      message: 'You have been logged out successfully.',
    };
  } else if (!flash && (req.query.deleted === '1' || req.query.deleted === 'account')) {
    flash = {
      type: 'success',
      message: 'Your account has been permanently deleted.',
    };
  }

  res.render('pages/home', {
    title: 'Student Portal — Cognifyz',
    flash,
  });
};

/**
 * GET /privacy
 * Displays public Privacy Policy page
 */
exports.getPrivacy = (req, res) => {
  res.render('privacy', {
    title: 'Privacy Policy — Cognifyz Student Portal',
  });
};

/**
 * GET /terms
 * Displays public Terms & Conditions page
 */
exports.getTerms = (req, res) => {
  res.render('terms', {
    title: 'Terms & Conditions — Cognifyz Student Portal',
  });
};
