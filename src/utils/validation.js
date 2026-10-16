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

// ── Task 2 Constants ─────────────────────────────────────────────
const VALID_COURSES = [
  'Computer Science',
  'Information Technology',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Software Engineering',
  'Web Development',
  'Other',
];

const VALID_GENDERS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
];

const VALID_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Postgraduate',
];

/**
 * Calculate age in completed years from a YYYY-MM-DD date string.
 * @param {string} dobString - e.g. "2004-05-15"
 * @returns {number|null} age in years, or null if invalid date
 */
function calculateAge(dobString) {
  if (!dobString || typeof dobString !== 'string') return null;
  const parts = dobString.split('-');
  if (parts.length !== 3) return null;
  const year  = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day   = parseInt(parts[2], 10);
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validate student fields for Task 2 registration.
 * Builds on Task 1 with Date of Birth, Gender, Year of Study, and LinkedIn URL.
 *
 * @param {object} data - Form data
 * @param {object} [options] - Options ({ requireTask2Fields: boolean })
 * @returns {Array<{field: string, message: string}>} - array of errors
 */
function validateStudentTask2(data, options = {}) {
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
  } = data || {};

  // Start with Task 1 baseline validation for common fields
  const errors = validateStudentTask1({ name, email, course, phone, message });

  // Determine if extended fields are strictly required
  // Required if formVersion === '2' or options.requireTask2Fields === true
  const strictTask2 = Boolean(formVersion === '2' || options.requireTask2Fields);

  // ── Date of Birth ──────────────────────────────────────────────
  if (!dob || dob.trim().length === 0) {
    if (strictTask2) {
      errors.push({ field: 'dob', message: 'Date of birth is required.' });
    }
  } else {
    const trimmedDob = dob.trim();
    // Validate ISO date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) {
      errors.push({ field: 'dob', message: 'Date of birth must be in YYYY-MM-DD format.' });
    } else {
      const birthDate = new Date(trimmedDob);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        errors.push({ field: 'dob', message: 'Please enter a valid calendar date.' });
      } else if (birthDate > today) {
        errors.push({ field: 'dob', message: 'Date of birth cannot be in the future.' });
      } else {
        const age = calculateAge(trimmedDob);
        if (age === null || age < 16) {
          errors.push({ field: 'dob', message: 'Student must be at least 16 years old to register.' });
        } else if (age > 100) {
          errors.push({ field: 'dob', message: 'Please enter a realistic date of birth (under 100 years).' });
        }
      }
    }
  }

  // ── Gender ─────────────────────────────────────────────────────
  if (!gender || gender.trim().length === 0) {
    if (strictTask2) {
      errors.push({ field: 'gender', message: 'Please select your gender.' });
    }
  } else if (!VALID_GENDERS.includes(gender.trim())) {
    errors.push({ field: 'gender', message: 'Please select a valid gender option.' });
  }

  // ── Year of Study ──────────────────────────────────────────────
  if (!year || year.trim().length === 0) {
    if (strictTask2) {
      errors.push({ field: 'year', message: 'Please select your year of study.' });
    }
  } else if (!VALID_YEARS.includes(year.trim())) {
    errors.push({ field: 'year', message: 'Please select a valid year of study.' });
  }

  // ── LinkedIn Profile URL (optional) ────────────────────────────
  if (linkedin && linkedin.trim().length > 0) {
    const trimmedUrl = linkedin.trim();
    if (trimmedUrl.length > 200) {
      errors.push({ field: 'linkedin', message: 'LinkedIn URL must be 200 characters or fewer.' });
    } else {
      // Must start with http:// or https://
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.push({ field: 'linkedin', message: 'LinkedIn URL must start with http:// or https://' });
        } else if (!parsed.hostname.includes('linkedin.com')) {
          errors.push({ field: 'linkedin', message: 'Please provide a valid LinkedIn URL (must contain linkedin.com).' });
        }
      } catch {
        errors.push({ field: 'linkedin', message: 'Please enter a valid URL (e.g. https://linkedin.com/in/username).' });
      }
    }
  }

  return errors;
}

module.exports = {
  validateStudentTask1,
  validateStudentTask2,
  calculateAge,
  VALID_COURSES,
  VALID_GENDERS,
  VALID_YEARS,
};

