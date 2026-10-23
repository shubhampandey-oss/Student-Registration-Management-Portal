'use strict';

/**
 * src/routes/api.routes.js
 * RESTful API Routes — Level 3 (Task 5) & Security/Caching — Level 4 (Task 7 & 8)
 */

const express        = require('express');
const router         = express.Router();
const controller     = require('../controllers/api.controller');
const cacheService   = require('../services/cache.service');
const cronService    = require('../services/cron.service');
const { strictTestLimiter } = require('../middleware/rateLimiter.middleware');

// ── Interactive API Documentation & Console ──────────────────────
router.get('/docs', controller.getApiDocs);

// ── System Health & Telemetry Endpoint (Task 8) ──────────────────
router.get('/v1/health', (req, res) => {
  const metrics = cronService.getSystemMetrics();
  res.status(200).json({
    status: 'UP',
    telemetry: metrics,
    timestamp: new Date().toISOString(),
  });
});

// ── Automated Backup Management Endpoints (Task 8) ────────────────
router.get('/v1/cron/backups', (req, res) => {
  const backups = cronService.listBackups();
  res.json({
    success: true,
    count: backups.length,
    backups,
  });
});

router.post('/v1/cron/backup', (req, res) => {
  try {
    const backup = cronService.runDatabaseBackup();
    res.status(201).json({
      success: true,
      message: 'Database backup generated successfully.',
      backup,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Backup Generation Failed',
      message: err.message,
    });
  }
});

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
