/**
 * public/js/main.js
 * Client-side JavaScript — Task 1
 *
 * Responsibilities:
 *  1. Textarea character counter (live feedback)
 *  2. Highlight the active nav link based on current URL
 *  3. Auto-dismiss the success flash banner after 5 seconds
 *
 * NOTE: This does NOT perform form validation.
 * Validation is handled on the SERVER (src/utils/validation.js).
 * Adding client-side validation is a Task 2 requirement.
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
    updateCount(); // initialise on load (handles pre-filled values on error re-render)
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
      // Use Bootstrap's Alert API to dismiss with animation
      const bsAlert = bootstrap.Alert.getOrCreateInstance(flashEl);
      if (bsAlert) bsAlert.close();
    }, 5000);
  }

});
