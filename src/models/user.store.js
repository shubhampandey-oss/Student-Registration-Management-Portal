'use strict';

/**
 * src/models/user.store.js
 * User repository providing authentication, password hashing,
 * and user management backed by SQLite.
 */

const bcrypt    = require('bcrypt');
const dbManager = require('./db');

/**
 * Strip sensitive password hashes from user records
 */
function sanitizeUser(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...clean } = user;
  return clean;
}

/**
 * Find user by email (case-insensitive)
 */
function findByEmail(email) {
  if (!email) return null;
  return dbManager.queryOne(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
    [email.trim()]
  );
}

/**
 * Find user by primary ID
 */
function findById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;
  return dbManager.queryOne(
    'SELECT * FROM users WHERE id = ?',
    [numericId]
  );
}

/**
 * Create a new user with bcrypt password hash
 */
async function create({ name, email, password, role = 'student' }) {
  const existing = findByEmail(email);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const createdAt = new Date().toISOString();
  const validRole = role === 'admin' ? 'admin' : 'student';

  const { lastInsertRowid } = dbManager.run(
    `INSERT INTO users (name, email, passwordHash, role, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), email.trim().toLowerCase(), passwordHash, validRole, createdAt]
  );

  const newUser = findById(lastInsertRowid);
  return sanitizeUser(newUser);
}

/**
 * Authenticate user credentials against bcrypt hash
 */
async function authenticate(email, password) {
  const user = findByEmail(email);
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return null;

  return sanitizeUser(user);
}

/**
 * Return all users (sanitized)
 */
function getAll() {
  const users = dbManager.query('SELECT * FROM users ORDER BY id ASC');
  return users.map(sanitizeUser);
}

/**
 * Count total registered users
 */
function count() {
  const res = dbManager.queryOne('SELECT COUNT(*) as count FROM users');
  return res ? res.count : 0;
}

/**
 * Update user's password hash by email
 */
async function updatePassword(email, newPassword) {
  const user = findByEmail(email);
  if (!user) return null;

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  dbManager.run(
    'UPDATE users SET passwordHash = ? WHERE id = ?',
    [passwordHash, user.id]
  );

  // If this email also exists in students table, update it for data consistency
  try {
    dbManager.run(
      'UPDATE students SET passwordHash = ? WHERE LOWER(email) = LOWER(?)',
      [passwordHash, user.email]
    );
  } catch (err) {
    // Non-fatal if table/row does not exist
  }

  const updated = findById(user.id);
  return sanitizeUser(updated);
}

/**
 * Delete user by ID
 */
function deleteById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return false;
  const user = findById(numericId);
  if (!user) return false;

  dbManager.run('DELETE FROM users WHERE id = ?', [numericId]);
  return true;
}

module.exports = {
  findByEmail,
  findById,
  create,
  authenticate,
  updatePassword,
  deleteById,
  getAll,
  count,
  sanitizeUser,
};
