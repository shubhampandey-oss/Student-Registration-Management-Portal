'use strict';

/**
 * src/controllers/student.controller.js
 *
 * Task 1: Handles student registration form display and submission.
 * In-memory array stores submissions temporarily (no database yet).
 * The database (SQLite) is integrated in Task 6.
 *
 * WHY in-memory storage for now?
 *   We can demonstrate the full form → validation → success flow
 *   without setting up a database, keeping Task 1 focused on
 *   server interaction and EJS rendering as required by the brief.
 */

const { validateStudentTask2, calculateAge } = require('../utils/validation');

// Temporary in-memory store.
// Each entry: { id, name, email, course, phone, dob, age, gender, year, linkedin, message, createdAt }
const students = [];
let   nextId   = 1;

// ─────────────────────────────────────────────────────────────────
// GET /students/register
// ─────────────────────────────────────────────────────────────────
exports.getRegisterForm = (req, res) => {
  res.render('pages/register', {
    title:  'Register a Student',
    errors: [],
    old:    {},          // no previous input on fresh load
    flash:  null,
  });
};

// ─────────────────────────────────────────────────────────────────
// POST /students/register
// ─────────────────────────────────────────────────────────────────
exports.postRegister = (req, res) => {
  const {
    name,
    email,
    course,
    phone,
    dob,
    gender,
    year,
    linkedin,
    message,
    formVersion,
  } = req.body;

  // Server-side validation (independent of browser/client rules)
  const errors = validateStudentTask2(req.body);

  if (errors.length > 0) {
    // Re-render the form with the errors AND the values the user typed,
    // so they don't have to retype everything.
    return res.status(422).render('pages/register', {
      title:  'Register a Student',
      errors,
      old:    req.body,
      flash:  null,
    });
  }

  // Store the valid submission with Task 2 attributes
  const student = {
    id:        nextId++,
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    course:    course.trim(),
    phone:     phone.trim(),
    dob:       dob ? dob.trim() : null,
    age:       dob ? calculateAge(dob.trim()) : null,
    gender:    gender ? gender.trim() : null,
    year:      year ? year.trim() : null,
    linkedin:  linkedin && linkedin.trim().length > 0 ? linkedin.trim() : null,
    message:   (message || '').trim(),
    createdAt: new Date().toISOString(),
  };
  students.push(student);

  // Redirect to the success / detail page (POST → Redirect → GET pattern)
  res.redirect(`/students/${student.id}?success=1`);
};

// ─────────────────────────────────────────────────────────────────
// GET /students
// ─────────────────────────────────────────────────────────────────
exports.listStudents = (req, res) => {
  res.render('pages/students-list', {
    title:    'Registered Students',
    students: students.slice().reverse(), // newest first
    flash:    null,
  });
};

// ─────────────────────────────────────────────────────────────────
// GET /students/:id
// ─────────────────────────────────────────────────────────────────
exports.getStudentDetail = (req, res) => {
  const id      = parseInt(req.params.id, 10);
  const student = students.find(s => s.id === id);

  if (!student) {
    return res.status(404).render('pages/error', {
      title:   '404 — Student Not Found',
      code:    404,
      message: `No student with ID ${id} was found.`,
    });
  }

  const flash = req.query.success === '1'
    ? { type: 'success', text: `Registration successful! Welcome, ${student.name}.` }
    : null;

  res.render('pages/student-detail', {
    title:   `${student.name} — Student Profile`,
    student,
    flash,
  });
};

// Export students array so tests can inspect it
exports._students = students;
