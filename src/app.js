'use strict';

/**
 * src/app.js
 * Main Express application entry point.
 * Loads environment variables, configures middleware,
 * registers routes, and starts the HTTP server.
 */

require('dotenv').config();

const express  = require('express');
const path     = require('path');
const morgan   = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// ── View engine ────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ── Static files ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Request parsing ────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── HTTP request logging ───────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Flash-like local helpers (Task 1 — simple in-memory flash) ─
// We use res.locals so every EJS template can read flash messages.
app.use((req, res, next) => {
  res.locals.flash = null;
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// ── Routes ─────────────────────────────────────────────────────
const indexRouter   = require('./routes/index.routes');
const studentRouter = require('./routes/student.routes');

app.use('/',         indexRouter);
app.use('/students', studentRouter);

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title:   '404 — Page Not Found',
    code:    404,
    message: `The page you requested (${req.path}) does not exist.`,
  });
});

// ── Global error handler ───────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[ERROR]', err.message);
  if (isDev) console.error(err.stack);

  res.status(err.status || 500).render('pages/error', {
    title:   'Server Error',
    code:    err.status || 500,
    message: isDev ? err.message : 'Something went wrong. Please try again.',
  });
});

// ── Start server ───────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n✅  Student Portal running at http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});

module.exports = { app, server }; // exported for automated tests
