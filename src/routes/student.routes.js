'use strict';

/**
 * src/routes/student.routes.js
 * Routes for student registration form (Task 1).
 * Later tasks will extend this file with CRUD, API, and auth routes.
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/student.controller');

// GET  /students/register  → Show the registration form
router.get('/register', controller.getRegisterForm);

// POST /students/register  → Handle form submission
router.post('/register', controller.postRegister);

// GET  /students           → List all submitted students
router.get('/', controller.listStudents);

// GET  /students/:id       → View a single student's details
router.get('/:id', controller.getStudentDetail);

module.exports = router;
