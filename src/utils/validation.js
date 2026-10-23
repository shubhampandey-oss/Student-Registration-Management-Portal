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

// ── Task 4 Constants ─────────────────────────────────────────────
const VALID_ROOM_TYPES = ['Single', 'Double', 'Triple', 'Suite'];
const VALID_DIETARY = ['Vegetarian', 'Non-Vegetarian', 'Vegan'];
const VALID_INCOME_BRACKETS = ['< 2.5 LPA', '2.5 - 5 LPA', '5 - 8 LPA', '> 8 LPA'];

/**
 * Evaluate password security strength and return granular scoring
 * @param {string} password
 * @returns {object} { score, label, color, percent, checks }
 */
function evaluatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return {
      score: 0,
      label: 'Too Short',
      percent: 0,
      color: 'danger',
      isValid: false,
      checks: {
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasDigit: false,
        hasSpecial: false,
      },
    };
  }

  // Support standard symbols like !@#$%^&*()_+\-=[]{};':"|,.<>/?`~ as well as any other non-alphanumeric chars
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password) || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };

  const isValid = Boolean(
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasDigit &&
    checks.hasSpecial
  );

  let score = 0;
  if (checks.minLength) score++;
  if (checks.hasUpper) score++;
  if (checks.hasLower) score++;
  if (checks.hasDigit) score++;
  if (checks.hasSpecial) score++;
  if (password.length >= 12 && score >= 4) score = 5;

  let label = 'Very Weak';
  let color = 'danger';
  let percent = 20;

  if (score <= 1) {
    label = 'Very Weak';
    color = 'danger';
    percent = 20;
  } else if (score === 2) {
    label = 'Weak';
    color = 'warning';
    percent = 40;
  } else if (score === 3) {
    label = 'Medium';
    color = 'info';
    percent = 60;
  } else if (score === 4) {
    label = 'Strong';
    color = 'primary';
    percent = 80;
  } else if (score >= 5) {
    label = 'Very Strong';
    color = 'success';
    percent = 100;
  }

  return { score, label, color, percent, checks, isValid };
}

/**
 * Validate student fields for Task 4 registration.
 * Builds on Task 2 with Password credentials and dynamic conditional sections:
 *  - Hostel/Accommodation sub-fields
 *  - Scholarship application sub-fields
 *
 * @param {object} data
 * @param {object} [options]
 * @returns {Array<{field: string, message: string}>}
 */
function validateStudentTask4(data, options = {}) {
  const {
    password,
    confirmPassword,
    requiresHostel,
    roomType,
    dietary,
    emergencyContact,
    emergencyPhone,
    appliesScholarship,
    prevGpa,
    annualIncome,
    formVersion,
  } = data || {};

  // Start with Task 2 baseline validation
  const errors = validateStudentTask2(data, options);

  const isTask4Form = formVersion === '4' || options.requirePassword;

  // ── Password Credentials ───────────────────────────────────────
  if (isTask4Form || (password && password.length > 0)) {
    if (!password || password.length === 0) {
      errors.push({ field: 'password', message: 'Password is required to create your student account.' });
    } else {
      const strength = evaluatePasswordStrength(password);
      if (password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters long.' });
      } else if (!strength.isValid) {
        errors.push({
          field: 'password',
          message: 'Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.',
        });
      }
    }

    // Confirm password
    if (!confirmPassword || confirmPassword.length === 0) {
      errors.push({ field: 'confirmPassword', message: 'Please confirm your password.' });
    } else if (password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }
  }

  // ── Conditional Section 1: Hostel / Accommodation ──────────────
  const hasHostel = requiresHostel === 'on' || requiresHostel === 'true' || requiresHostel === true;
  if (hasHostel) {
    if (!roomType || !VALID_ROOM_TYPES.includes(roomType.trim())) {
      errors.push({ field: 'roomType', message: 'Please select a valid room preference.' });
    }

    if (!dietary || !VALID_DIETARY.includes(dietary.trim())) {
      errors.push({ field: 'dietary', message: 'Please select your dietary preference.' });
    }

    if (!emergencyContact || emergencyContact.trim().length < 2) {
      errors.push({ field: 'emergencyContact', message: 'Emergency contact person name is required (min 2 characters).' });
    }

    if (!emergencyPhone || emergencyPhone.trim().length === 0) {
      errors.push({ field: 'emergencyPhone', message: 'Emergency contact phone number is required.' });
    } else {
      const digits = emergencyPhone.replace(/[\s\-()+]/g, '');
      if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) {
        errors.push({ field: 'emergencyPhone', message: 'Emergency phone must be a valid number between 7 and 15 digits.' });
      }
    }
  }

  // ── Conditional Section 2: Scholarship Application ─────────────
  const hasScholarship = appliesScholarship === 'on' || appliesScholarship === 'true' || appliesScholarship === true;
  if (hasScholarship) {
    if (!prevGpa || String(prevGpa).trim().length === 0) {
      errors.push({ field: 'prevGpa', message: 'Previous academic score (CGPA or %) is required for scholarship consideration.' });
    } else {
      const score = parseFloat(prevGpa);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.push({ field: 'prevGpa', message: 'Please enter a valid CGPA (0.0-10.0) or percentage (0-100).' });
      } else if (score <= 10 && score < 6.0) {
        errors.push({ field: 'prevGpa', message: 'Minimum 6.0 CGPA required to apply for merit scholarships.' });
      } else if (score > 10 && score < 60) {
        errors.push({ field: 'prevGpa', message: 'Minimum 60% required to apply for merit scholarships.' });
      }
    }

    if (!annualIncome || !VALID_INCOME_BRACKETS.includes(annualIncome.trim())) {
      errors.push({ field: 'annualIncome', message: 'Please select your annual family income bracket.' });
    }
  }

  return errors;
}

module.exports = {
  validateStudentTask1,
  validateStudentTask2,
  validateStudentTask4,
  calculateAge,
  evaluatePasswordStrength,
  VALID_COURSES,
  VALID_GENDERS,
  VALID_YEARS,
  VALID_ROOM_TYPES,
  VALID_DIETARY,
  VALID_INCOME_BRACKETS,
};


