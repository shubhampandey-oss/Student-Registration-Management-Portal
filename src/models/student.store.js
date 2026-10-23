'use strict';

/**
 * src/models/student.store.js
 * Central repository for student records backed by SQLite via sql.js.
 * Maintains an active in-memory array `students` synchronized with SQLite
 * for seamless backward compatibility across Tasks 1–5 controllers & tests.
 */

const dbManager = require('./db');

const students = [];

/**
 * Normalizes boolean/integer and string fields from SQLite
 */
function normalizeStudent(row) {
  if (!row) return null;
  const hostelReq = row.hostelRequired === 1 || row.hostelRequired === true || row.hostelRequired === '1';
  return {
    ...row,
    id: Number(row.id),
    age: row.age != null ? Number(row.age) : null,
    hostelRequired: hostelReq,
    scholarshipScore: row.scholarshipScore != null ? Number(row.scholarshipScore) : null,
    // Provide nested objects if present or reconstruct for Task 4 tests
    hostel: hostelReq ? (row.hostel || {
      roomType: row.hostelRoomType || 'Single',
      emergencyPhone: row.hostelEmergencyPhone || '',
    }) : null,
    scholarship: (row.scholarshipCategory || row.scholarship) ? (row.scholarship || {
      category: row.scholarshipCategory || '',
      score: row.scholarshipScore != null ? Number(row.scholarshipScore) : null,
    }) : null,
  };
}

/**
 * Synchronize in-memory `students` array with SQLite rows
 */
function syncFromDb() {
  const rows = dbManager.query('SELECT * FROM students ORDER BY id ASC');
  students.length = 0;
  for (const r of rows) {
    students.push(normalizeStudent(r));
  }
}

// Ensure database initialization populates `students`
dbManager.ensureDbReady().then(() => {
  syncFromDb();
}).catch(err => {
  console.error('[STUDENT STORE] Initial sync failed:', err.message);
});

/**
 * Retrieve all students ordered by ID
 */
function getAll() {
  const rows = dbManager.query('SELECT * FROM students ORDER BY id ASC');
  if (rows && rows.length > 0) {
    students.length = 0;
    for (const r of rows) {
      students.push(normalizeStudent(r));
    }
  }
  return students;
}

/**
 * Find student by numeric ID
 */
function findById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  // Try in SQLite first
  const row = dbManager.queryOne('SELECT * FROM students WHERE id = ?', [numericId]);
  if (row) {
    const student = normalizeStudent(row);
    // Keep in-memory cache synchronized
    const idx = students.findIndex(s => s.id === numericId);
    if (idx !== -1) students[idx] = student;
    else students.push(student);
    return student;
  }

  // Fallback to in-memory array
  return students.find(s => s.id === numericId) || null;
}

/**
 * Calculate next available integer ID
 */
function getNextId() {
  if (students.length === 0) return 1;
  const maxId = Math.max(...students.map(s => (typeof s.id === 'number' ? s.id : parseInt(s.id, 10) || 0)));
  return maxId + 1;
}

/**
 * Add a new student record to SQLite and in-memory array
 */
function add(studentData) {
  const createdAt = studentData.createdAt || new Date().toISOString();
  const hostelReq = (studentData.hostelRequired === true || studentData.hostelRequired === '1' || studentData.hostelRequired === 1) ? 1 : 0;

  const res = dbManager.run(
    `INSERT INTO students (
      name, email, phone, course, message,
      dob, age, gender, year, linkedin, skills,
      hostelRequired, hostelRoomType, hostelEmergencyPhone,
      scholarshipCategory, scholarshipScore, passwordHash,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentData.name || '',
      studentData.email || '',
      studentData.phone || '',
      studentData.course || '',
      studentData.message || '',
      studentData.dob || '',
      studentData.age != null ? Number(studentData.age) : null,
      studentData.gender || '',
      studentData.year || '',
      studentData.linkedin || '',
      studentData.skills || '',
      hostelReq,
      studentData.hostelRoomType || (studentData.hostel && studentData.hostel.roomType) || '',
      studentData.hostelEmergencyPhone || (studentData.hostel && studentData.hostel.emergencyPhone) || '',
      studentData.scholarshipCategory || '',
      studentData.scholarshipScore != null ? Number(studentData.scholarshipScore) : null,
      studentData.passwordHash || null,
      createdAt,
      null
    ]
  );

  const assignedId = res.lastInsertRowid || getNextId();
  const student = normalizeStudent({
    id: assignedId,
    ...studentData,
    hostelRequired: hostelReq === 1,
    createdAt,
  });

  const existingIdx = students.findIndex(s => s.id === assignedId);
  if (existingIdx !== -1) {
    students[existingIdx] = student;
  } else {
    students.push(student);
  }

  return student;
}

/**
 * Update an existing student record in SQLite
 */
function update(id, updates) {
  const existing = findById(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  delete merged.id;
  delete merged.createdAt;

  const updatedAt = new Date().toISOString();
  const hostelReq = (merged.hostelRequired === true || merged.hostelRequired === '1' || merged.hostelRequired === 1) ? 1 : 0;

  dbManager.run(
    `UPDATE students SET
      name = ?, email = ?, phone = ?, course = ?, message = ?,
      dob = ?, age = ?, gender = ?, year = ?, linkedin = ?, skills = ?,
      hostelRequired = ?, hostelRoomType = ?, hostelEmergencyPhone = ?,
      scholarshipCategory = ?, scholarshipScore = ?, passwordHash = ?,
      updatedAt = ?
     WHERE id = ?`,
    [
      merged.name,
      merged.email,
      merged.phone,
      merged.course,
      merged.message,
      merged.dob,
      merged.age != null ? Number(merged.age) : null,
      merged.gender,
      merged.year,
      merged.linkedin,
      merged.skills,
      hostelReq,
      merged.hostelRoomType,
      merged.hostelEmergencyPhone,
      merged.scholarshipCategory,
      merged.scholarshipScore != null ? Number(merged.scholarshipScore) : null,
      merged.passwordHash,
      updatedAt,
      parseInt(id, 10)
    ]
  );

  const updatedStudent = normalizeStudent({
    ...merged,
    id: parseInt(id, 10),
    hostelRequired: hostelReq === 1,
    updatedAt,
  });

  const idx = students.findIndex(s => s.id === parseInt(id, 10));
  if (idx !== -1) {
    students[idx] = updatedStudent;
  }

  return updatedStudent;
}

/**
 * Remove a student by numeric ID
 */
function remove(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return false;

  dbManager.run('DELETE FROM students WHERE id = ?', [numericId]);

  const idx = students.findIndex(s => s.id === numericId);
  if (idx !== -1) {
    students.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Clear all student records
 */
function clear() {
  dbManager.run('DELETE FROM students');
  dbManager.run("DELETE FROM sqlite_sequence WHERE name = 'students'");
  students.length = 0;
}

module.exports = {
  students,
  getAll,
  findById,
  getNextId,
  add,
  update,
  remove,
  clear,
  syncFromDb,
};
