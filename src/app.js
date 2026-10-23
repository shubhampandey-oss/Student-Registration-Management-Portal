'use strict';

/**
 * src/app.js
 * Main Express application entry point.
 * Loads environment variables, configures middleware, sessions,
 * database readiness, registers routes, and starts the HTTP server.
 */

require('dotenv').config();

const express   = require('express');
const path      = require('path');
const morgan    = require('morgan');
const session   = require('express-session');
const dbManager = require('./models/db');

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

// ── Session management (Task 6) ────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'cognifyz-internship-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ── Database readiness & view locals middleware ────────────────
app.use(async (req, res, next) => {
  try {
    await dbManager.ensureDbReady();
  } catch (err) {
    console.error('[DB] Ready check error:', err.message);
  }

  // Session-based flash message support
  res.locals.flash = (req.session && req.session.flash) ? req.session.flash : null;
  if (req.session && req.session.flash) {
    delete req.session.flash;
  }

  req.setFlash = (type, message) => {
    if (req.session) {
      req.session.flash = { type, message };
    }
  };

  // Expose current authenticated user to all EJS templates
  res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// ── Routes ─────────────────────────────────────────────────────
const indexRouter   = require('./routes/index.routes');
const studentRouter = require('./routes/student.routes');
const authRouter    = require('./routes/auth.routes');
const apiRouter     = require('./routes/api.routes');

app.use('/',         indexRouter);
app.use('/students', studentRouter);
app.use('/auth',     authRouter);
app.use('/api',      apiRouter);

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error:   'API Endpoint Not Found',
      message: `The requested route ${req.method} ${req.path} does not exist. Refer to /api/docs for available endpoints.`,
      code:    404,
    });
  }

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
