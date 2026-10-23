'use strict';

/**
 * src/routes/api.routes.js
 * RESTful API Routes — Level 3 (Task 5) & Security/Caching — Level 4 (Task 7)
 */

const express        = require('express');
const router         = express.Router();
const controller     = require('../controllers/api.controller');
const cacheService   = require('../services/cache.service');
const { strictTestLimiter } = require('../middleware/rateLimiter.middleware');

// ── Interactive API Documentation & Console ──────────────────────
router.get('/docs', controller.getApiDocs);

// ── Rate Limit Verification Endpoint (Task 7) ────────────────────
router.get('/test-rate-limit', strictTestLimiter, (req, res) => {
  res.json({ success: true, message: 'Request within rate limit.' });
});

// ── Student CRUD Endpoints (v1) with Response Caching ─────────────
// List students (filtering, sorting, pagination, cached with X-Cache headers)
router.get('/v1/students', cacheService.cacheMiddleware(60), controller.getAllStudents);

// Get single student by ID
router.get('/v1/students/:id', controller.getStudentById);

// Create new student via JSON payload
router.post('/v1/students', controller.createStudent);

// Update existing student via JSON payload
router.put('/v1/students/:id', controller.updateStudent);

// Delete student by ID
router.delete('/v1/students/:id', controller.deleteStudent);

module.exports = router;
