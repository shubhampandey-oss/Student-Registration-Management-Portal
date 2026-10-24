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
  if (form) {
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
      },
      emergencyContact: {
        el: document.getElementById('emergencyContact'),
        err: document.getElementById('emergencyContactError'),
        validate(val) {
          const hostelOn = document.getElementById('requiresHostelToggle')?.checked;
          if (!hostelOn) return '';
          if (!val || val.trim().length < 2) return 'Emergency contact name is required (min 2 chars).';
          return '';
        }
      },
      emergencyPhone: {
        el: document.getElementById('emergencyPhone'),
        err: document.getElementById('emergencyPhoneError'),
        validate(val) {
          const hostelOn = document.getElementById('requiresHostelToggle')?.checked;
          if (!hostelOn) return '';
          if (!val || val.trim().length === 0) return 'Emergency contact phone is required.';
          const digits = val.replace(/[\s\-()+]/g, '');
          if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) {
            return 'Phone must be between 7 and 15 digits.';
          }
          return '';
        }
      },
      prevGpa: {
        el: document.getElementById('prevGpa'),
        err: document.getElementById('prevGpaError'),
        validate(val) {
          const scholarshipOn = document.getElementById('appliesScholarshipToggle')?.checked;
          if (!scholarshipOn) return '';
          if (!val || val.trim().length === 0) return 'Academic score is required for scholarship.';
          const score = parseFloat(val);
          if (isNaN(score) || score < 0 || score > 100) return 'Enter a valid score (0.0-10.0 or 0-100%).';
          if (score <= 10 && score < 6.0) return 'Minimum 6.0 CGPA required.';
          if (score > 10 && score < 60) return 'Minimum 60% required.';
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
        if (config.el) {
          config.el.classList.remove('is-invalid');
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
          if (config.el.classList.contains('is-invalid')) {
            validateField(key);
          }
        });
        config.el.addEventListener('change', function () {
          validateField(key);
        });
      }
    });

    // ── Task 4: Dynamic Password Strength Meter & Live Checklist ──
    const pwInput         = document.getElementById('password');
    const confirmPwInput  = document.getElementById('confirmPassword');
    const pwStrengthBar   = document.getElementById('passwordStrengthBar');
    const pwStrengthLabel = document.getElementById('passwordStrengthLabel');

    const chkMinLength = document.getElementById('chkMinLength');
    const chkUpper     = document.getElementById('chkUpper');
    const chkLower     = document.getElementById('chkLower');
    const chkDigit     = document.getElementById('chkDigit');
    const chkSpecial   = document.getElementById('chkSpecial');
    const chkMatch     = document.getElementById('chkMatch');

    function updateChecklistItem(el, isValid) {
      if (!el) return;
      const icon = el.querySelector('i');
      if (isValid) {
        el.className = el.className.replace('text-muted', '') + ' valid';
        if (icon) icon.className = 'bi bi-check-circle-fill text-success me-1';
      } else {
        el.className = el.className.replace('valid', '').trim();
        if (icon) icon.className = 'bi bi-circle text-muted me-1';
      }
    }

    function evaluateClientPassword() {
      if (!pwInput) return;
      const val = pwInput.value;
      const confirmVal = confirmPwInput ? confirmPwInput.value : '';

      const minLength = val.length >= 8;
      const hasUpper  = /[A-Z]/.test(val);
      const hasLower  = /[a-z]/.test(val);
      const hasDigit  = /[0-9]/.test(val);
      const hasSpec   = /[^A-Za-z0-9]/.test(val) || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val);
      const isMatch   = val.length > 0 && confirmVal.length > 0 && val === confirmVal;

      updateChecklistItem(chkMinLength, minLength);
      updateChecklistItem(chkUpper, hasUpper);
      updateChecklistItem(chkLower, hasLower);
      updateChecklistItem(chkDigit, hasDigit);
      updateChecklistItem(chkSpecial, hasSpec);
      updateChecklistItem(chkMatch, isMatch);

      let score = 0;
      if (minLength) score++;
      if (hasUpper) score++;
      if (hasLower) score++;
      if (hasDigit) score++;
      if (hasSpec) score++;
      if (val.length >= 12 && score >= 4) score = 5;

      if (!pwStrengthBar || !pwStrengthLabel) return;

      if (val.length === 0) {
        pwStrengthBar.style.width = '0%';
        pwStrengthBar.className = 'progress-bar bg-danger';
        pwStrengthLabel.textContent = 'Enter password';
        pwStrengthLabel.className = 'fw-bold text-muted';
      } else if (score <= 1) {
        pwStrengthBar.style.width = '20%';
        pwStrengthBar.className = 'progress-bar bg-danger';
        pwStrengthLabel.textContent = 'Very Weak';
        pwStrengthLabel.className = 'fw-bold text-danger';
      } else if (score === 2) {
        pwStrengthBar.style.width = '40%';
        pwStrengthBar.className = 'progress-bar bg-warning';
        pwStrengthLabel.textContent = 'Weak';
        pwStrengthLabel.className = 'fw-bold text-warning';
      } else if (score === 3) {
        pwStrengthBar.style.width = '60%';
        pwStrengthBar.className = 'progress-bar bg-info';
        pwStrengthLabel.textContent = 'Medium';
        pwStrengthLabel.className = 'fw-bold text-info';
      } else if (score === 4) {
        pwStrengthBar.style.width = '80%';
        pwStrengthBar.className = 'progress-bar bg-primary';
        pwStrengthLabel.textContent = 'Strong';
        pwStrengthLabel.className = 'fw-bold text-primary';
      } else {
        pwStrengthBar.style.width = '100%';
        pwStrengthBar.className = 'progress-bar bg-success';
        pwStrengthLabel.textContent = 'Very Strong';
        pwStrengthLabel.className = 'fw-bold text-success';
      }
    }

    if (pwInput) {
      pwInput.addEventListener('input', evaluateClientPassword);
    }
    if (confirmPwInput) {
      confirmPwInput.addEventListener('input', evaluateClientPassword);
    }

    // ── Task 4: Password Visibility Toggles ───────────────────────
    function wireTogglePassword(btnId, targetInputId) {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(targetInputId);
      if (!btn || !input) return;

      btn.addEventListener('click', function () {
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isPw ? 'bi bi-eye-slash text-warning' : 'bi bi-eye';
        }
      });
    }

    wireTogglePassword('togglePasswordBtn', 'password');
    wireTogglePassword('toggleConfirmPasswordBtn', 'confirmPassword');

    // ── Task 4: Conditional Form Toggles (Dynamic DOM) ────────────
    const hostelToggle = document.getElementById('requiresHostelToggle');
    const hostelBox    = document.getElementById('hostelDetailsContainer');
    if (hostelToggle && hostelBox) {
      hostelToggle.addEventListener('change', function () {
        if (hostelToggle.checked) {
          hostelBox.classList.remove('d-none');
        } else {
          hostelBox.classList.add('d-none');
        }
      });
    }

    const scholarshipToggle = document.getElementById('appliesScholarshipToggle');
    const scholarshipBox    = document.getElementById('scholarshipDetailsContainer');
    if (scholarshipToggle && scholarshipBox) {
      scholarshipToggle.addEventListener('change', function () {
        if (scholarshipToggle.checked) {
          scholarshipBox.classList.remove('d-none');
        } else {
          scholarshipBox.classList.add('d-none');
        }
      });
    }

    // ── Task 4: Confirmation Review Modal Integration ─────────────
    const reviewBtn = document.getElementById('reviewSubmitBtn');
    const confirmModalEl = document.getElementById('confirmSubmitModal');
    const modalFinalSubmitBtn = document.getElementById('modalFinalSubmitBtn');

    if (reviewBtn && confirmModalEl) {
      reviewBtn.addEventListener('click', function () {
        // Run full client validation
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
          if (firstInvalidEl) {
            firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof firstInvalidEl.focus === 'function') {
              firstInvalidEl.focus();
            }
          }
          return;
        }

        // Populate Review Modal details
        document.getElementById('modalReviewName').textContent = document.getElementById('name')?.value || '—';
        document.getElementById('modalReviewEmail').textContent = document.getElementById('email')?.value || '—';
        document.getElementById('modalReviewCourse').textContent = `${document.getElementById('course')?.value || ''} (${document.getElementById('year')?.value || ''})`;
        document.getElementById('modalReviewPhone').textContent = document.getElementById('phone')?.value || '—';

        if (hostelToggle && hostelToggle.checked) {
          const rType = document.getElementById('roomType')?.value || 'Single';
          const diet = document.getElementById('dietary')?.value || 'Vegetarian';
          document.getElementById('modalReviewHostel').textContent = `${rType} Room (${diet})`;
        } else {
          document.getElementById('modalReviewHostel').textContent = 'Not requested';
        }

        if (scholarshipToggle && scholarshipToggle.checked) {
          const gpa = document.getElementById('prevGpa')?.value || '';
          document.getElementById('modalReviewScholarship').textContent = `Score: ${gpa}`;
        } else {
          document.getElementById('modalReviewScholarship').textContent = 'Not requested';
        }

        // Show Bootstrap Modal
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          const bsModal = bootstrap.Modal.getOrCreateInstance(confirmModalEl);
          bsModal.show();
        } else {
          // Fallback if modal script not ready: submit form directly
          form.submit();
        }
      });
    }

    if (modalFinalSubmitBtn) {
      modalFinalSubmitBtn.addEventListener('click', function () {
        form.submit();
      });
    }

    // Direct submit listener as fallback
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
        if (firstInvalidEl) {
          firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof firstInvalidEl.focus === 'function') {
            firstInvalidEl.focus();
          }
        }
      }
    });
  }

  // ── 8. Task 3: Interactive Real-Time Search & Course/Year Filtering ─
  const searchInput     = document.getElementById('studentSearchInput');
  const courseFilter    = document.getElementById('courseFilterSelect');
  const yearFilter      = document.getElementById('yearFilterSelect');
  const clearSearchBtn  = document.getElementById('clearSearchBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const quickTags       = document.querySelectorAll('.cp-quick-tag');
  const counterEl       = document.getElementById('studentResultsCounter');
  const noResultsBox    = document.getElementById('noFilterResults');
  const studentCards    = document.querySelectorAll('.cp-student-col');

  if (studentCards.length > 0) {
    const totalCount = studentCards.length;

    function applyFilters() {
      const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const selectedCourse = courseFilter ? courseFilter.value : 'All';
      const selectedYear   = yearFilter ? yearFilter.value : 'All';

      let visibleCount = 0;

      studentCards.forEach(col => {
        const name   = col.getAttribute('data-name') || '';
        const email  = col.getAttribute('data-email') || '';
        const phone  = col.getAttribute('data-phone') || '';
        const course = col.getAttribute('data-course') || '';
        const year   = col.getAttribute('data-year') || '';

        const matchesQuery = !q ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          course.toLowerCase().includes(q);

        const matchesCourse = selectedCourse === 'All' || course === selectedCourse;
        const matchesYear   = selectedYear === 'All' || year === selectedYear;

        if (matchesQuery && matchesCourse && matchesYear) {
          col.classList.remove('d-none');
          col.style.opacity = '1';
          visibleCount++;
        } else {
          col.classList.add('d-none');
        }
      });

      // Update counter
      if (counterEl) {
        counterEl.textContent = `Showing ${visibleCount} of ${totalCount} registered student${totalCount !== 1 ? 's' : ''}.`;
      }

      // Toggle no results state
      if (noResultsBox) {
        if (visibleCount === 0) {
          noResultsBox.classList.remove('d-none');
        } else {
          noResultsBox.classList.add('d-none');
        }
      }

      // Sync quick tags
      quickTags.forEach(tag => {
        if (tag.getAttribute('data-course') === selectedCourse) {
          tag.classList.add('active');
        } else {
          tag.classList.remove('active');
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    if (courseFilter) {
      courseFilter.addEventListener('change', applyFilters);
    }

    if (yearFilter) {
      yearFilter.addEventListener('change', applyFilters);
    }

    if (clearSearchBtn && searchInput) {
      clearSearchBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        applyFilters();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        if (courseFilter) courseFilter.value = 'All';
        if (yearFilter) yearFilter.value = 'All';
        applyFilters();
      });
    }

    quickTags.forEach(tag => {
      tag.addEventListener('click', function () {
        const course = tag.getAttribute('data-course');
        if (courseFilter) {
          courseFilter.value = course;
          applyFilters();
        }
      });
    });
  }

  // ── 9. Task 3: Floating Back-to-Top Button ────────────────────
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ── 10. Task 5: Asynchronous fetch() Student Delete & Toast ────
  function showApiToast(message, isSuccess = true) {
    const toastEl = document.getElementById('apiToast');
    const msgEl   = document.getElementById('apiToastMessage');
    const iconEl  = document.getElementById('apiToastIcon');
    if (!toastEl || !msgEl) return;

    msgEl.textContent = message;
    if (iconEl) {
      iconEl.className = isSuccess
        ? 'bi bi-check-circle-fill text-success fs-5'
        : 'bi bi-exclamation-triangle-fill text-danger fs-5';
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const bsToast = bootstrap.Toast.getOrCreateInstance(toastEl);
      bsToast.show();
    }
  }

  document.querySelectorAll('.cp-delete-btn').forEach(btn => {
    btn.addEventListener('click', async function (e) {
      e.preventDefault();
      const id   = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name') || `Student #${id}`;

      if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

      try {
        const response = await fetch(`/api/v1/students/${id}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const cardCol = btn.closest('.cp-student-col');
          if (cardCol) {
            cardCol.style.transition = 'all 0.4s ease';
            cardCol.style.opacity = '0';
            cardCol.style.transform = 'scale(0.85)';
            setTimeout(() => {
              cardCol.remove();
              // Update student counter
              const remaining = document.querySelectorAll('.cp-student-col').length;
              const counterEl = document.getElementById('studentResultsCounter');
              if (counterEl) {
                counterEl.textContent = `Showing ${remaining} of ${remaining} registered student${remaining !== 1 ? 's' : ''}.`;
              }
              if (remaining === 0) {
                const noRes = document.getElementById('noFilterResults');
                if (noRes) noRes.classList.remove('d-none');
              }
            }, 400);
          }
          showApiToast(`Student #${id} (${name}) was deleted via REST API.`, true);
        } else {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash"></i>';
          showApiToast(data.message || 'Failed to delete student.', false);
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash"></i>';
        showApiToast('Network error while attempting deletion.', false);
      }
    });
  });

  // ── 11. Task 5: Interactive Live API Documentation Console ─────
  const methodSelect       = document.getElementById('apiMethodSelect');
  const endpointInput      = document.getElementById('apiEndpointInput');
  const bodyContainer      = document.getElementById('apiRequestBodyContainer');
  const bodyTextarea       = document.getElementById('apiRequestBody');
  const sendRequestBtn     = document.getElementById('sendApiRequestBtn');
  const responseViewer     = document.getElementById('apiResponseViewer');
  const responseStatus     = document.getElementById('apiResponseStatus');
  const responseTime       = document.getElementById('apiResponseTime');
  const copyResponseBtn    = document.getElementById('copyApiResponseBtn');
  const loadSamplePostBtn  = document.getElementById('loadSamplePostBtn');
  const loadSamplePutBtn   = document.getElementById('loadSamplePutBtn');

  if (methodSelect && sendRequestBtn && responseViewer) {

    // Toggle body container visibility for POST / PUT
    methodSelect.addEventListener('change', function () {
      const m = methodSelect.value;
      if (m === 'POST' || m === 'PUT') {
        bodyContainer.classList.remove('d-none');
      } else {
        bodyContainer.classList.add('d-none');
      }
    });

    if (loadSamplePostBtn && bodyTextarea) {
      loadSamplePostBtn.addEventListener('click', function () {
        bodyTextarea.value = JSON.stringify({
          name:     'Rhea Kapoor',
          email:    `rhea.${Date.now().toString().slice(-4)}@example.com`,
          course:   'Artificial Intelligence',
          year:     '2nd Year',
          phone:    '+91 98765 11223',
          dob:      '2003-07-20',
          gender:   'Female',
          password: 'Secure@ApiPass1'
        }, null, 2);
      });
    }

    if (loadSamplePutBtn && bodyTextarea) {
      loadSamplePutBtn.addEventListener('click', function () {
        bodyTextarea.value = JSON.stringify({
          phone:  '+91 99000 88776',
          course: 'Data Science',
          year:   '3rd Year'
        }, null, 2);
      });
    }

    sendRequestBtn.addEventListener('click', async function () {
      const method   = methodSelect.value;
      let   path     = endpointInput.value.trim();
      if (!path.startsWith('/')) path = '/' + path;
      const fullUrl  = path.startsWith('/api') ? path : `/api${path}`;

      let options = {
        method,
        headers: {
          'Accept': 'application/json'
        }
      };

      if (method === 'POST' || method === 'PUT') {
        const rawBody = bodyTextarea.value.trim();
        if (rawBody) {
          try {
            JSON.parse(rawBody); // validate syntax
            options.headers['Content-Type'] = 'application/json';
            options.body = rawBody;
          } catch (jsonErr) {
            responseStatus.className = 'badge bg-danger';
            responseStatus.textContent = 'Invalid JSON Body';
            responseViewer.textContent = 'Error: The request body contains invalid JSON syntax.\n' + jsonErr.message;
            return;
          }
        }
      }

      sendRequestBtn.disabled = true;
      sendRequestBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Running...';
      responseStatus.className = 'badge bg-secondary';
      responseStatus.textContent = 'Sending request...';
      responseViewer.textContent = 'Connecting to server...';

      const startTime = performance.now();

      try {
        const res = await fetch(fullUrl, options);
        const duration = Math.round(performance.now() - startTime);

        let data;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        // Format status badge
        if (res.status >= 200 && res.status < 300) {
          responseStatus.className = 'badge bg-success';
        } else if (res.status >= 400 && res.status < 500) {
          responseStatus.className = 'badge bg-warning text-dark';
        } else {
          responseStatus.className = 'badge bg-danger';
        }
        responseStatus.textContent = `${res.status} ${res.statusText || ''}`;
        if (responseTime) responseTime.textContent = `(${duration} ms)`;

        responseViewer.textContent = typeof data === 'object'
          ? JSON.stringify(data, null, 2)
          : data;

      } catch (networkErr) {
        responseStatus.className = 'badge bg-danger';
        responseStatus.textContent = 'Network Error';
        responseViewer.textContent = 'Error: ' + networkErr.message;
      } finally {
        sendRequestBtn.disabled = false;
        sendRequestBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i>Send';
      }
    });

    if (copyResponseBtn) {
      copyResponseBtn.addEventListener('click', function () {
        const text = responseViewer.textContent;
        navigator.clipboard.writeText(text).then(() => {
          copyResponseBtn.innerHTML = '<i class="bi bi-check2 text-success me-1"></i>Copied!';
          setTimeout(() => {
            copyResponseBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy';
          }, 2000);
        });
      });
    }

  }

});



