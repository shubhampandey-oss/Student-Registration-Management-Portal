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

const bcrypt       = require('bcrypt');
const store        = require('../models/student.store');
const userStore    = require('../models/user.store');
const cacheService = require('../services/cache.service');
const { validateStudentTask4, calculateAge } = require('../utils/validation');

// Central store reference
const students = store.students;

// ─────────────────────────────────────────────────────────────────
// GET /students/register
// ─────────────────────────────────────────────────────────────────
exports.getRegisterForm = (req, res) => {
  const formAction = req.originalUrl && req.originalUrl.includes('register-student')
    ? '/register-student'
    : '/students/register';

  res.render('pages/register', {
    title:      'Register a Student',
    errors:     [],
    old:        {},          // no previous input on fresh load
    flash:      res.locals.flash,
    formAction,
  });
};

// ─────────────────────────────────────────────────────────────────
// POST /students/register
// ─────────────────────────────────────────────────────────────────
exports.postRegister = async (req, res) => {
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
    requiresHostel,
    roomType,
    dietary,
    emergencyContact,
    emergencyPhone,
    appliesScholarship,
    prevGpa,
    annualIncome,
    formVersion,
  } = req.body;

  // Server-side validation (Task 4 rules without password)
  const errors = validateStudentTask4(req.body);

  if (errors.length > 0) {
    const formAction = req.originalUrl && req.originalUrl.includes('register-student')
      ? '/register-student'
      : '/students/register';
    // Re-render the form with the errors AND the values the user typed,
    // so they don't have to retype everything.
    return res.status(422).render('pages/register', {
      title:      'Register a Student',
      errors,
      old:        req.body,
      flash:      null,
      formAction,
    });
  }

  // Automatically associate student record with the logged-in user
  let parentUserId = null;
  if (req.session && (req.session.userId || (req.session.user && req.session.user.id))) {
    parentUserId = req.session.userId || req.session.user.id;
  } else if (req.user && (req.user.id || req.user.userId)) {
    parentUserId = req.user.id || req.user.userId;
  } else if (req.session && req.session.user && req.session.user.email) {
    const parentUser = userStore.findByEmail(req.session.user.email);
    if (parentUser) parentUserId = parentUser.id;
  }

  const hasHostel = requiresHostel === 'on' || requiresHostel === 'true' || requiresHostel === true;
  const hasScholarship = appliesScholarship === 'on' || appliesScholarship === 'true' || appliesScholarship === true;

  // Store the valid submission with Task 4 attributes
  const student = {
    id:           store.getNextId(),
    user_id:      parentUserId,
    userId:       parentUserId,
    name:         name.trim(),
    email:        email.trim().toLowerCase(),
    course:       course.trim(),
    phone:        phone.trim(),
    dob:          dob ? dob.trim() : null,
    age:          dob ? calculateAge(dob.trim()) : null,
    gender:       gender ? gender.trim() : null,
    year:         year ? year.trim() : null,
    linkedin:     linkedin && linkedin.trim().length > 0 ? linkedin.trim() : null,
    message:      (message || '').trim(),
    hasAccount:     Boolean(parentUserId),
    passwordHash:   null,
    hostelRequired: hasHostel,
    hostel: hasHostel ? {
      roomType:         roomType ? roomType.trim() : 'Single',
      dietary:          dietary ? dietary.trim() : 'Vegetarian',
      emergencyContact: (emergencyContact || '').trim(),
      emergencyPhone:   (emergencyPhone || '').trim(),
    } : null,
    scholarship: hasScholarship ? {
      prevGpa:      (prevGpa || '').trim(),
      annualIncome: (annualIncome || '').trim(),
    } : null,
    createdAt: new Date().toISOString(),
  };

  const created = store.add(student);
  cacheService.invalidateStudentsCache();

  // Redirect to the success / detail page (POST → Redirect → GET pattern)
  res.redirect(`/students/${created.id || student.id}?success=1`);
};

// ─────────────────────────────────────────────────────────────────
// GET /students
// ─────────────────────────────────────────────────────────────────
exports.listStudents = (req, res) => {
  const query        = (req.query.q || '').trim().toLowerCase();
  const courseFilter = (req.query.course || '').trim();
  const yearFilter   = (req.query.year || '').trim();

  let filtered = students.slice().reverse(); // newest first

  if (query) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      (s.phone && s.phone.includes(query)) ||
      (s.course && s.course.toLowerCase().includes(query))
    );
  }

  if (courseFilter && courseFilter !== 'All') {
    filtered = filtered.filter(s => s.course === courseFilter);
  }

  if (yearFilter && yearFilter !== 'All') {
    filtered = filtered.filter(s => s.year === yearFilter);
  }

  res.render('pages/students-list', {
    title:          'Registered Students',
    students:       filtered,
    totalCount:     students.length,
    searchQuery:    req.query.q || '',
    selectedCourse: courseFilter || 'All',
    selectedYear:   yearFilter || 'All',
    flash:          null,
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
