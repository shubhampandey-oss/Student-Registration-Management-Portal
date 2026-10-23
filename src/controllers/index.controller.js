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
      message: 'Your account has been deleted successfully.',
    };
  }

  res.render('pages/home', {
    title: 'Student Portal — Cognifyz',
    flash,
  });
};
