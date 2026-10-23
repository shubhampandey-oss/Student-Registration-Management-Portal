'use strict';

/**
 * src/models/student.store.js
 * Central in-memory repository for students data.
 * Shared seamlessly across both Web Controller and REST API Controller.
 * (Replaced with persistent sql.js SQLite in Task 6).
 */

const students = [];
let nextId = 1;

function getAll() {
  return students;
}

function getNextId() {
  return nextId++;
}

function findById(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;
  return students.find(s => s.id === numericId) || null;
}

function add(studentData) {
  const student = {
    id: getNextId(),
    ...studentData,
    createdAt: studentData.createdAt || new Date().toISOString(),
  };
  students.push(student);
  return student;
}

function update(id, updates) {
  const student = findById(id);
  if (!student) return null;

  // Never overwrite ID or createdAt
  delete updates.id;
  delete updates.createdAt;

  Object.assign(student, updates, { updatedAt: new Date().toISOString() });
  return student;
}

function remove(id) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return false;
  const index = students.findIndex(s => s.id === numericId);
  if (index === -1) return false;
  students.splice(index, 1);
  return true;
}

function clear() {
  students.length = 0;
  nextId = 1;
}

module.exports = {
  students,
  getAll,
  getNextId,
  findById,
  add,
  update,
  remove,
  clear,
};
