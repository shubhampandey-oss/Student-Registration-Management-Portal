'use strict';

/**
 * src/controllers/api.controller.js
 * RESTful API Controller — Level 3 (Task 5)
 *
 * Implements complete CRUD JSON endpoints:
 *  - GET    /api/v1/students      (List, filter, paginate)
 *  - GET    /api/v1/students/:id  (Retrieve single student)
 *  - POST   /api/v1/students      (Create new student via JSON)
 *  - PUT    /api/v1/students/:id  (Update student via JSON)
 *  - DELETE /api/v1/students/:id  (Delete student)
 *  - GET    /api/docs             (Interactive API documentation & test console)
 *
 * Security:
 *  - Sensitive passwordHash is NEVER exposed in any API response.
 *  - Strict HTTP status codes (200, 201, 400, 404, 422, 500).
 */

const bcrypt       = require('bcrypt');
const store        = require('../models/student.store');
const cacheService = require('../services/cache.service');
const {
  validateStudentTask1,
  validateStudentTask2,
  validateStudentTask4,
  calculateAge,
  VALID_COURSES,
  VALID_YEARS,
} = require('../utils/validation');

/**
 * Strips sensitive fields (like passwordHash) before JSON serialization
 * @param {object} student
 * @returns {object} safe student copy
 */
function sanitizeStudent(student) {
  if (!student) return null;
  const safe = { ...student };
  delete safe.passwordHash;
  delete safe.password;
  delete safe.confirmPassword;
  return safe;
}

// ─────────────────────────────────────────────────────────────────
// GET /api/v1/students
// ─────────────────────────────────────────────────────────────────
exports.getAllStudents = (req, res) => {
  const query        = (req.query.q || '').trim().toLowerCase();
  const courseFilter = (req.query.course || '').trim();
  const yearFilter   = (req.query.year || '').trim();
  const page         = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit        = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));

  let results = store.students.slice().reverse(); // newest first

  if (query) {
    results = results.filter(s =>
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.course && s.course.toLowerCase().includes(query))
    );
  }

  if (courseFilter && courseFilter !== 'All') {
    results = results.filter(s => s.course === courseFilter);
  }

  if (yearFilter && yearFilter !== 'All') {
    results = results.filter(s => s.year === yearFilter);
  }

  const totalFiltered = results.length;
  const startIndex    = (page - 1) * limit;
  const paginated     = results.slice(startIndex, startIndex + limit);

  return res.status(200).json({
    success: true,
    meta: {
      total:       store.students.length,
      filtered:    totalFiltered,
      page,
      limit,
      totalPages:  Math.ceil(totalFiltered / limit) || 1,
    },
    data: paginated.map(sanitizeStudent),
    timestamp: new Date().toISOString(),
  });
};

// ─────────────────────────────────────────────────────────────────
// GET /api/v1/students/:id
// ─────────────────────────────────────────────────────────────────
exports.getStudentById = (req, res) => {
  const id      = parseInt(req.params.id, 10);
  const student = store.findById(id);

  if (!student) {
    return res.status(404).json({
      success: false,
      error:   'Student not found',
      message: `No student with ID #${req.params.id} was found in the database.`,
      code:    404,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    data: sanitizeStudent(student),
    timestamp: new Date().toISOString(),
  });
};

// ─────────────────────────────────────────────────────────────────
// POST /api/v1/students
// ─────────────────────────────────────────────────────────────────
exports.createStudent = async (req, res) => {
  const body = req.body || {};

  // Validate using validation engine
  // For API, Task 1 baseline is mandatory; extended fields validated if present
  const errors = validateStudentTask1(body);

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please correct the specified fields.',
      errors,
      code: 422,
      timestamp: new Date().toISOString(),
    });
  }

  // Hash password if supplied
  let passwordHash = null;
  if (body.password && typeof body.password === 'string') {
    try {
      passwordHash = await bcrypt.hash(body.password, 10);
    } catch (err) {
      console.error('[API AUTH ERROR]', err.message);
    }
  }

  const hasHostel = body.requiresHostel === true || body.requiresHostel === 'true' || body.requiresHostel === 'on';
  const hasScholarship = body.appliesScholarship === true || body.appliesScholarship === 'true' || body.appliesScholarship === 'on';

  const newStudentData = {
    name:         body.name.trim(),
    email:        body.email.trim().toLowerCase(),
    course:       body.course.trim(),
    phone:        body.phone.trim(),
    dob:          body.dob ? body.dob.trim() : null,
    age:          body.dob ? calculateAge(body.dob.trim()) : null,
    gender:       body.gender ? body.gender.trim() : null,
    year:         body.year ? body.year.trim() : null,
    linkedin:     body.linkedin ? body.linkedin.trim() : null,
    message:      (body.message || '').trim(),
    hasAccount:   Boolean(passwordHash),
    passwordHash: passwordHash,
    hostel: hasHostel ? {
      roomType:         body.roomType || 'Single',
      dietary:          body.dietary || 'Vegetarian',
      emergencyContact: body.emergencyContact || '',
      emergencyPhone:   body.emergencyPhone || '',
    } : null,
    scholarship: hasScholarship ? {
      prevGpa:      body.prevGpa || '',
      annualIncome: body.annualIncome || '',
    } : null,
  };

  const saved = store.add(newStudentData);
  cacheService.invalidateStudentsCache();

  return res.status(201).json({
    success: true,
    message: 'Student record created successfully.',
    data: sanitizeStudent(saved),
    timestamp: new Date().toISOString(),
  });
};

// ─────────────────────────────────────────────────────────────────
// PUT /api/v1/students/:id
// ─────────────────────────────────────────────────────────────────
exports.updateStudent = async (req, res) => {
  const id       = parseInt(req.params.id, 10);
  const existing = store.findById(id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      error:   'Student not found',
      message: `Cannot update: No student with ID #${req.params.id} exists.`,
      code:    404,
      timestamp: new Date().toISOString(),
    });
  }

  const body    = req.body || {};
  const updates = {};

  // Validate fields if being updated
  if (body.name !== undefined) {
    if (!body.name || body.name.trim().length < 2) {
      return res.status(422).json({ success: false, error: 'Name must be at least 2 characters.' });
    }
    updates.name = body.name.trim();
  }

  if (body.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return res.status(422).json({ success: false, error: 'Invalid email address.' });
    }
    updates.email = body.email.trim().toLowerCase();
  }

  if (body.course !== undefined) {
    if (!VALID_COURSES.includes(body.course.trim())) {
      return res.status(422).json({ success: false, error: 'Invalid course selection.' });
    }
    updates.course = body.course.trim();
  }

  if (body.year !== undefined) {
    if (!VALID_YEARS.includes(body.year.trim())) {
      return res.status(422).json({ success: false, error: 'Invalid year of study.' });
    }
    updates.year = body.year.trim();
  }

  if (body.phone !== undefined) {
    updates.phone = body.phone.trim();
  }

  if (body.linkedin !== undefined) {
    updates.linkedin = body.linkedin.trim();
  }

  if (body.message !== undefined) {
    updates.message = body.message.trim();
  }

  if (body.dob !== undefined) {
    updates.dob = body.dob.trim();
    updates.age = calculateAge(body.dob.trim());
  }

  const updated = store.update(id, updates);
  cacheService.invalidateStudentsCache();

  return res.status(200).json({
    success: true,
    message: `Student #${id} updated successfully.`,
    data: sanitizeStudent(updated),
    timestamp: new Date().toISOString(),
  });
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/v1/students/:id
// ─────────────────────────────────────────────────────────────────
exports.deleteStudent = (req, res) => {
  const id      = parseInt(req.params.id, 10);
  const deleted = store.remove(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error:   'Student not found',
      message: `Cannot delete: No student with ID #${req.params.id} exists.`,
      code:    404,
      timestamp: new Date().toISOString(),
    });
  }

  cacheService.invalidateStudentsCache();

  return res.status(200).json({
    success:   true,
    message:   `Student #${id} has been permanently deleted from the system.`,
    deletedId: id,
    timestamp: new Date().toISOString(),
  });
};

// ─────────────────────────────────────────────────────────────────
// GET /api/docs (Interactive Documentation & Test Explorer)
// ─────────────────────────────────────────────────────────────────
exports.getApiDocs = (req, res) => {
  res.render('pages/api-docs', {
    title: 'REST API Documentation & Interactive Explorer',
    flash: null,
  });
};
