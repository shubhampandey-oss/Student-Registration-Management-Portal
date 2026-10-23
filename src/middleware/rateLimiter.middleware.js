'use strict';

/**
 * src/middleware/rateLimiter.middleware.js
 * Rate limiting configurations powered by express-rate-limit.
 * Defends against brute-force attacks, DDoS, and API scraping.
 */

const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

/**
 * Global application rate limiter
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 250, // Higher limit in test mode to avoid test suite false-positives
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Global rate limit exceeded. Please wait a few minutes before trying again.',
    code: 429,
  },
});

/**
 * Strict authentication limiter for login and registration endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 50 : 10, // 10 attempts per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Attempts',
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    code: 429,
  },
});

/**
 * API rate limiter for /api/* endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 500 : 120, // 120 API requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API Rate Limit Exceeded',
    message: 'Too many API requests sent from this client. Please slow down.',
    code: 429,
  },
});

/**
 * Dedicated strict test limiter (for fast automated test verification of 429)
 */
const strictTestLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 2, // triggers 429 on 3rd request
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate Limit Exceeded',
    message: 'Strict test rate limit triggered successfully.',
    code: 429,
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  strictTestLimiter,
};
