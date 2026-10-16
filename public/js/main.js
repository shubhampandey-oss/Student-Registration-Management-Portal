/**
 * public/js/main.js
 * Client-side JavaScript — Task 2
 *
 * Responsibilities:
 *  1. Textarea character counter (live feedback)
 *  2. Highlight the active nav link based on current URL
 *  3. Auto-dismiss flash messages
 *  4. Interactive radio pill button state toggling
 *  5. Real-time Age calculation from Date of Birth input
 *  6. Full client-side real-time form validation (blur + input)
 *  7. Form submit interception & accessible focus management
 *
 * ARCHITECTURAL NOTE (Task 2 Core Concept):
 *  Client-side validation provides INSTANT USER FEEDBACK (UX improvement).
 *  It DOES NOT replace server-side validation. Anyone can bypass this by
 *  disabling JS, editing the DOM, or using curl/Postman.
 *  The server remains the ultimate source of truth.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  // ── 1. Textarea character counter ────────────────────────────
  const messageArea  = document.getElementById('message');
  const countDisplay = document.getElementById('messageCount');

  if (messageArea && countDisplay) {
    function updateCount() {
      const len = messageArea.value.length;
      countDisplay.textContent = `${len} / 500`;
      countDisplay.style.color = len > 450
        ? (len >= 500 ? 'var(--cp-danger)' : 'var(--cp-warning)')
        : 'var(--cp-muted)';
    }
    messageArea.addEventListener('input', updateCount);
    updateCount();
  }

  // ── 2. Active nav link highlight ─────────────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.cp-navbar .nav-link').forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;
    const isActive = href === '/'
      ? currentPath === '/'
      : currentPath.startsWith(href);
    if (isActive) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // ── 3. Auto-dismiss flash messages ───────────────────────────
  const flashEl = document.getElementById('flashMessage');
  if (flashEl) {
    setTimeout(function () {
      if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(flashEl);
        if (bsAlert) bsAlert.close();
      }
    }, 5000);
  }

  // ── 4. Radio Pill Active State Toggle ────────────────────────
  const pillLabels = document.querySelectorAll('.cp-pill-radio');
  pillLabels.forEach(label => {
    const radio = label.querySelector('input[type="radio"]');
    if (!radio) return;

    label.addEventListener('click', function () {
      const groupName = radio.name;
      document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
        const parent = r.closest('.cp-pill-radio');
        if (parent) parent.classList.remove('active');
      });
      label.classList.add('active');
      radio.checked = true;

      // Trigger validation for gender
      validateField('gender');
    });
  });

  // ── 5. Real-Time Age Calculator Helper ───────────────────────
  const dobInput = document.getElementById('dob');
  const ageBadge = document.getElementById('ageBadge');

  function calculateCompletedAge(dobVal) {
    if (!dobVal) return null;
    const birthDate = new Date(dobVal);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function updateAgeDisplay() {
    if (!dobInput || !ageBadge) return;
    const val = dobInput.value;
    if (!val) {
      ageBadge.textContent = '—';
      ageBadge.className = 'fw-bold text-muted';
      return;
    }
    const age = calculateCompletedAge(val);
    if (age === null) {
      ageBadge.textContent = 'Invalid date';
      ageBadge.className = 'fw-bold text-danger';
    } else if (age < 0) {
      ageBadge.textContent = 'Future date!';
      ageBadge.className = 'fw-bold text-danger';
    } else if (age < 16) {
      ageBadge.textContent = `${age} yrs (Must be ≥16)`;
      ageBadge.className = 'fw-bold text-danger';
    } else {
      ageBadge.textContent = `${age} years old`;
      ageBadge.className = 'fw-bold text-success';
    }
  }

  if (dobInput) {
    dobInput.addEventListener('input', updateAgeDisplay);
    dobInput.addEventListener('change', updateAgeDisplay);
    updateAgeDisplay();
  }

  // ── 6. Client-Side Real-Time Form Validation Engine ──────────
  const form = document.getElementById('registrationForm');
  if (!form) return;

  const fields = {
    name: {
      el: document.getElementById('name'),
      err: document.getElementById('nameError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Full name is required.';
        if (val.trim().length < 2) return 'Name must be at least 2 characters.';
        if (val.trim().length > 100) return 'Name must be 100 characters or fewer.';
        if (!/^[a-zA-Z\s'-]+$/.test(val.trim())) {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes.';
        }
        return '';
      }
    },
    email: {
      el: document.getElementById('email'),
      err: document.getElementById('emailError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Email address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
          return 'Please enter a valid email address.';
        }
        if (val.trim().length > 254) return 'Email address is too long.';
        return '';
      }
    },
    dob: {
      el: document.getElementById('dob'),
      err: document.getElementById('dobError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Date of birth is required.';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return 'Date of birth must be YYYY-MM-DD.';
        const birthDate = new Date(val.trim());
        const today = new Date();
        if (isNaN(birthDate.getTime())) return 'Please enter a valid date.';
        if (birthDate > today) return 'Date of birth cannot be in the future.';
        const age = calculateCompletedAge(val.trim());
        if (age < 16) return 'Student must be at least 16 years old to register.';
        if (age > 100) return 'Please enter a realistic date of birth.';
        return '';
      }
    },
    gender: {
      el: null, // multiple radios
      err: document.getElementById('genderError'),
      validate() {
        const checked = form.querySelector('input[name="gender"]:checked');
        if (!checked) return 'Please select your gender.';
        return '';
      }
    },
    course: {
      el: document.getElementById('course'),
      err: document.getElementById('courseError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Please select a course.';
        return '';
      }
    },
    year: {
      el: document.getElementById('year'),
      err: document.getElementById('yearError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Please select your year of study.';
        return '';
      }
    },
    phone: {
      el: document.getElementById('phone'),
      err: document.getElementById('phoneError'),
      validate(val) {
        if (!val || val.trim().length === 0) return 'Phone number is required.';
        const digits = val.replace(/[\s\-()+]/g, '');
        if (!/^\d+$/.test(digits)) return 'Phone can only contain digits, spaces, dashes, and parentheses.';
        if (digits.length < 7 || digits.length > 15) return 'Phone number must be between 7 and 15 digits.';
        return '';
      }
    },
    linkedin: {
      el: document.getElementById('linkedin'),
      err: document.getElementById('linkedinError'),
      validate(val) {
        if (!val || val.trim().length === 0) return ''; // optional
        const trimmed = val.trim();
        if (trimmed.length > 200) return 'LinkedIn URL must be 200 characters or fewer.';
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return 'LinkedIn URL must start with http:// or https://';
          }
          if (!parsed.hostname.includes('linkedin.com')) {
            return 'URL must contain linkedin.com';
          }
        } catch {
          return 'Please enter a valid URL (e.g. https://linkedin.com/in/username).';
        }
        return '';
      }
    },
    message: {
      el: document.getElementById('message'),
      err: document.getElementById('messageError'),
      validate(val) {
        if (val && val.trim().length > 500) return 'Message must be 500 characters or fewer.';
        return '';
      }
    }
  };

  /**
   * Validate a single field by key and update UI
   * @param {string} key
   * @returns {boolean} isValid
   */
  function validateField(key) {
    const config = fields[key];
    if (!config) return true;

    const val = config.el ? config.el.value : '';
    const errorMsg = config.validate(val);

    if (errorMsg) {
      // Mark invalid
      if (config.el) {
        config.el.classList.add('is-invalid');
        config.el.classList.remove('is-valid');
      }
      if (config.err) {
        config.err.textContent = errorMsg;
        config.err.classList.remove('d-none');
      }
      return false;
    } else {
      // Mark valid
      if (config.el) {
        config.el.classList.remove('is-invalid');
        // Only mark is-valid if value is present or field is required
        if (val.trim().length > 0) {
          config.el.classList.add('is-valid');
        } else {
          config.el.classList.remove('is-valid');
        }
      }
      if (config.err) {
        config.err.textContent = '';
        config.err.classList.add('d-none');
      }
      return true;
    }
  }

  // Attach real-time listeners (blur & input)
  Object.keys(fields).forEach(key => {
    const config = fields[key];
    if (config.el) {
      config.el.addEventListener('blur', function () {
        validateField(key);
      });
      config.el.addEventListener('input', function () {
        // If field already has an invalid state, give real-time recovery feedback
        if (config.el.classList.contains('is-invalid')) {
          validateField(key);
        }
      });
      config.el.addEventListener('change', function () {
        validateField(key);
      });
    }
  });

  // ── 7. Form Submission Guard & Accessibility Focus ───────────
  form.addEventListener('submit', function (event) {
    let formIsValid = true;
    let firstInvalidEl = null;

    Object.keys(fields).forEach(key => {
      const isValid = validateField(key);
      if (!isValid) {
        formIsValid = false;
        if (!firstInvalidEl) {
          firstInvalidEl = fields[key].el || document.getElementById(`field-${key}`);
        }
      }
    });

    if (!formIsValid) {
      event.preventDefault();
      event.stopPropagation();

      // Focus the first invalid element for keyboard accessibility
      if (firstInvalidEl) {
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof firstInvalidEl.focus === 'function') {
          firstInvalidEl.focus();
        }
      }
    }
  });

});

