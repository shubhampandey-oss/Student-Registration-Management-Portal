'use strict';

/**
 * src/utils/validation.js
 *
 * Server-side validation helpers.
 * These run on the server and cannot be bypassed by the browser.
 *
 * WHY server-side validation?
 *   A user can disable browser JavaScript or send raw HTTP requests
 *   using tools like Postman, curl, or a browser extension.
 *   Server-side validation is the only reliable protection.
 *
 * Client-side validation (Task 2+) adds user-experience polish,
 * but is NOT a security measure on its own.
 */

/**
 * Validate student fields for Task 1 registration.
 * @param {object} data - { name, email, course, phone, message }
 * @returns {Array<{field: string, message: string}>} - array of errors (empty if valid)
 */
function validateStudentTask1({ name, email, course, phone, message }) {
  const errors = [];

  // ── Name ──────────────────────────────────────────────────────
  if (!name || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Full name is required.' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name must be 100 characters or fewer.' });
  } else if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    errors.push({ field: 'name', message: 'Name can only contain letters, spaces, hyphens, and apostrophes.' });
  }

  // ── Email ─────────────────────────────────────────────────────
  if (!email || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email address is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  } else if (email.trim().length > 254) {
    errors.push({ field: 'email', message: 'Email address is too long.' });
  }

  // ── Course ────────────────────────────────────────────────────
  const validCourses = [
    'Computer Science',
    'Information Technology',
    'Data Science',
    'Artificial Intelligence',
    'Cybersecurity',
    'Software Engineering',
    'Web Development',
    'Other',
  ];
  if (!course || course.trim().length === 0) {
    errors.push({ field: 'course', message: 'Please select a course.' });
  } else if (!validCourses.includes(course.trim())) {
    errors.push({ field: 'course', message: 'Please select a valid course from the list.' });
  }

  // ── Phone ─────────────────────────────────────────────────────
  if (!phone || phone.trim().length === 0) {
    errors.push({ field: 'phone', message: 'Phone number is required.' });
  } else {
    // Strip spaces, dashes, parentheses, + for digit check
    const digits = phone.replace(/[\s\-()+]/g, '');
    if (!/^\d+$/.test(digits)) {
      errors.push({ field: 'phone', message: 'Phone number can only contain digits, spaces, dashes, and parentheses.' });
    } else if (digits.length < 7 || digits.length > 15) {
      errors.push({ field: 'phone', message: 'Phone number must be between 7 and 15 digits.' });
    }
  }

  // ── Message (optional) ────────────────────────────────────────
  if (message && message.trim().length > 500) {
    errors.push({ field: 'message', message: 'Message must be 500 characters or fewer.' });
  }

  return errors;
}

module.exports = { validateStudentTask1 };
