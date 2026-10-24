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

/**
 * GET /contact
 * Displays public Contact Us page
 */
exports.getContact = (req, res) => {
  let flash = res.locals.flash;
  if (!flash && req.query.success === '1') {
    flash = {
      type: 'success',
      message: 'Thank you for contacting us! Your inquiry has been received. Our team will get back to you shortly.',
    };
  }

  res.render('contact', {
    title: 'Contact Us — Cognifyz Student Portal',
    flash,
    errors: [],
    formData: {},
  });
};

/**
 * POST /contact
 * Handles Contact Us inquiry form submission
 */
exports.postContact = (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const errors = [];

  if (!name || !name.trim()) {
    errors.push({ field: 'name', message: 'Please enter your full name.' });
  }
  if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }
  if (!subject || !subject.trim()) {
    errors.push({ field: 'subject', message: 'Please provide a subject or inquiry topic.' });
  }
  if (!message || !message.trim() || message.trim().length < 5) {
    errors.push({ field: 'message', message: 'Please enter a message of at least 5 characters.' });
  }

  if (errors.length > 0) {
    return res.status(400).render('contact', {
      title: 'Contact Us — Cognifyz Student Portal',
      flash: { type: 'danger', message: errors[0].message },
      errors,
      formData: { name, email, subject, message },
    });
  }

  if (req.setFlash) {
    req.setFlash('success', 'Thank you for contacting us! Your inquiry has been received. Our team will get back to you shortly.');
  }

  return res.redirect('/contact?success=1');
};

