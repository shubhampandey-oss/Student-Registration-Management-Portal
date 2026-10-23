'use strict';

/**
 * src/middleware/sanitize.middleware.js
 * Input sanitization middleware for Cross-Site Scripting (XSS) defense.
 * Cleans user-supplied strings across req.body, req.query, and req.params
 * while preserving credentials and formatting.
 */

/**
 * Strips script tags, javascript: pseudo-protocols, and malicious event handlers
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags and their content
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove inline event handlers like onload, onerror, onclick
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
    // Remove javascript: pseudo-protocols
    .replace(/javascript:[^"'>\s]*/gi, '')
    .trim();
}

/**
 * Recursively sanitize objects and arrays
 */
function sanitizeValue(value, key = '') {
  // Do not alter password fields to preserve exact bcrypt inputs
  if (key.toLowerCase().includes('password')) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) => sanitizeValue(item, `${key}_${idx}`));
  }

  if (value !== null && typeof value === 'object') {
    const cleanObj = {};
    for (const [k, v] of Object.entries(value)) {
      cleanObj[k] = sanitizeValue(v, k);
    }
    return cleanObj;
  }

  return value;
}

/**
 * Express middleware to sanitize all incoming request inputs
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }

  next();
}

module.exports = {
  sanitizeInput,
  sanitizeString,
};
