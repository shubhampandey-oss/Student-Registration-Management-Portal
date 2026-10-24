'use strict';

/**
 * src/models/db.js
 * Pure JavaScript SQLite database manager powered by sql.js (WebAssembly).
 * Provides disk persistence to data/students.sqlite, schema migrations,
 * parameterized query helpers, and automatic seeding for Task 6.
 */

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
const bcrypt    = require('bcrypt');

const DB_DIR  = path.join(__dirname, '..', '..', 'data');
const DB_FILE = process.env.DB_PATH || path.join(
  DB_DIR,
  process.env.NODE_ENV === 'test' ? 'test_students.sqlite' : 'students.sqlite'
);

let SQL = null;
let db  = null;
let initPromise = null;

/**
 * Ensure database directory exists
 */
function ensureDirExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * Persist in-memory SQLite database state to disk
 */
function saveDb() {
  if (!db || DB_FILE === ':memory:') return;
  try {
    ensureDirExists();
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[DB] Failed to save SQLite database to disk:', err.message);
  }
}

/**
 * Seed initial administrative & student accounts and demo data
 */
async function seedInitialData() {
  // 1. Ensure default Admin account exists
  const adminEmail = 'admin@cognifyz.com';
  const existingAdmin = queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [adminEmail]);
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash('Admin@12345', 10);
    const now = new Date().toISOString();
    run(
      `INSERT INTO users (name, email, passwordHash, role, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      ['Cognifyz Admin', adminEmail, adminHash, 'admin', now]
    );
    console.log('[DB] Seeded default administrator account (admin@cognifyz.com / Admin@12345)');
  } else {
    const isMatch = await bcrypt.compare('Admin@12345', existingAdmin.passwordHash);
    if (!isMatch) {
      const adminHash = await bcrypt.hash('Admin@12345', 10);
      run('UPDATE users SET passwordHash = ? WHERE id = ?', [adminHash, existingAdmin.id]);
    }
  }

  // 2. Ensure default Student user account exists
  const studentEmail = 'student@cognifyz.com';
  const existingStudent = queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [studentEmail]);
  if (!existingStudent) {
    const studentHash = await bcrypt.hash('Student@12345', 10);
    const now = new Date().toISOString();
    run(
      `INSERT INTO users (name, email, passwordHash, role, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      ['Student User', studentEmail, studentHash, 'student', now]
    );
    console.log('[DB] Seeded default student user account (student@cognifyz.com / Student@12345)');
  } else {
    const isMatch = await bcrypt.compare('Student@12345', existingStudent.passwordHash);
    if (!isMatch) {
      const studentHash = await bcrypt.hash('Student@12345', 10);
      run('UPDATE users SET passwordHash = ? WHERE id = ?', [studentHash, existingStudent.id]);
    }
  }

  // 2. Seed initial demo students if empty
  const studentCount = queryOne('SELECT COUNT(*) as count FROM students');
  if (!studentCount || studentCount.count === 0) {
    const demoStudents = [
      {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        phone: '9876543210',
        course: 'Computer Science',
        message: 'Passionate about full-stack web development and cloud architectures.',
        dob: '2002-05-14',
        age: 22,
        gender: 'Male',
        year: '3rd Year',
        linkedin: 'https://linkedin.com/in/rohansharma',
        skills: 'JavaScript, Node.js, React, SQL',
        hostelRequired: 1,
        hostelRoomType: 'Double Occupancy (Non-AC)',
        hostelEmergencyPhone: '9876543211',
        scholarshipCategory: 'Merit-Based Scholarship',
        scholarshipScore: 92.5,
        passwordHash: null,
        createdAt: '2024-01-15T09:30:00.000Z',
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '9123456780',
        course: 'Data Science',
        message: 'Exploring machine learning pipelines and statistical predictive models.',
        dob: '2003-08-22',
        age: 21,
        gender: 'Female',
        year: '2nd Year',
        linkedin: 'https://linkedin.com/in/priyapatel',
        skills: 'Python, R, Machine Learning, Tableau',
        hostelRequired: 0,
        hostelRoomType: '',
        hostelEmergencyPhone: '',
        scholarshipCategory: 'Need-Based Financial Grant',
        scholarshipScore: 84.0,
        passwordHash: null,
        createdAt: '2024-02-10T14:15:00.000Z',
      },
      {
        name: 'Aarav Mehta',
        email: 'aarav.mehta@example.com',
        phone: '9988776655',
        course: 'Cybersecurity',
        message: 'Dedicated to network vulnerability research and penetration testing.',
        dob: '2001-11-03',
        age: 23,
        gender: 'Male',
        year: '4th Year',
        linkedin: 'https://linkedin.com/in/aaravmehta',
        skills: 'Network Security, Linux, Kali, Cryptography',
        hostelRequired: 1,
        hostelRoomType: 'Single Room (AC)',
        hostelEmergencyPhone: '9988776650',
        scholarshipCategory: 'First-Generation Scholar',
        scholarshipScore: 88.0,
        passwordHash: null,
        createdAt: '2024-03-05T11:45:00.000Z',
      },
    ];

    for (const s of demoStudents) {
      run(
        `INSERT INTO students (
          name, email, phone, course, message,
          dob, age, gender, year, linkedin, skills,
          hostelRequired, hostelRoomType, hostelEmergencyPhone,
          scholarshipCategory, scholarshipScore, passwordHash,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.name, s.email, s.phone, s.course, s.message,
          s.dob, s.age, s.gender, s.year, s.linkedin, s.skills,
          s.hostelRequired, s.hostelRoomType, s.hostelEmergencyPhone,
          s.scholarshipCategory, s.scholarshipScore, s.passwordHash,
          s.createdAt, null
        ]
      );
    }
  }

  saveDb();
}

/**
 * Initialize SQLite database with tables and initial data
 */
async function initDatabase() {
  if (db) return db;

  ensureDirExists();
  SQL = await initSqlJs();

  if (DB_FILE !== ':memory:' && fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('[DB] Existing SQLite file could not be read, creating fresh:', err.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      createdAt TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      course TEXT NOT NULL,
      message TEXT,
      dob TEXT NOT NULL,
      age INTEGER,
      gender TEXT NOT NULL,
      year TEXT NOT NULL,
      linkedin TEXT,
      skills TEXT,
      hostelRequired INTEGER DEFAULT 0,
      hostelRoomType TEXT,
      hostelEmergencyPhone TEXT,
      scholarshipCategory TEXT,
      scholarshipScore REAL,
      passwordHash TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );
  `);

  // Ensure user_id column exists if table was previously created
  try {
    const tableInfo = query("PRAGMA table_info(students)");
    const hasUserId = tableInfo && tableInfo.some(c => c.name === 'user_id');
    if (!hasUserId) {
      db.run("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
    }
  } catch (err) {
    // Migration fallback
  }

  await seedInitialData();
  return db;
}

/**
 * Return a promise ensuring the database is initialized
 */
function ensureDbReady() {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

/**
 * Execute parameterized SELECT returning array of row objects
 */
function query(sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  try {
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } finally {
    stmt.free();
  }
}

/**
 * Execute parameterized SELECT returning single row object or null
 */
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute INSERT, UPDATE, DELETE with parameters and persist to disk
 */
function run(sql, params = []) {
  if (!db) return { lastInsertRowid: null };
  db.run(sql, params);
  const idRes = db.exec('SELECT last_insert_rowid() AS id;');
  const lastInsertRowid = (idRes && idRes[0] && idRes[0].values && idRes[0].values[0])
    ? idRes[0].values[0][0]
    : null;

  saveDb();
  return { lastInsertRowid };
}

/**
 * Reset database tables (useful for test isolation)
 */
async function resetForTesting() {
  await ensureDbReady();
  db.run('DELETE FROM students;');
  db.run('DELETE FROM users;');
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('students', 'users');");
  await seedInitialData();
  saveDb();
}

// Start async initialization immediately on module load
ensureDbReady().catch(err => {
  console.error('[DB] Database initialization failed:', err);
});

module.exports = {
  ensureDbReady,
  query,
  queryOne,
  run,
  saveDb,
  resetForTesting,
  getDb: () => db,
};
