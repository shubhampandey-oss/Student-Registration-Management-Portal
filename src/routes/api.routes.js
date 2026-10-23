'use strict';

/**
 * src/routes/api.routes.js
 * RESTful API Routes — Task 5 (Level 3)
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/api.controller');

// ── Interactive API Documentation & Console ──────────────────────
router.get('/docs', controller.getApiDocs);

// ── Student CRUD Endpoints (v1) ──────────────────────────────────
// List students (filtering, sorting, pagination)
router.get('/v1/students', controller.getAllStudents);

// Get single student by ID
router.get('/v1/students/:id', controller.getStudentById);

// Create new student via JSON payload
router.post('/v1/students', controller.createStudent);

// Update existing student via JSON payload
router.put('/v1/students/:id', controller.updateStudent);

// Delete student by ID
router.delete('/v1/students/:id', controller.deleteStudent);

module.exports = router;
