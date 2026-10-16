'use strict';

/**
 * src/controllers/index.controller.js
 * Handles the landing page / home page.
 */

exports.getHome = (req, res) => {
  res.render('pages/home', {
    title: 'Student Portal — Cognifyz',
  });
};
