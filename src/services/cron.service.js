'use strict';

/**
 * src/services/cron.service.js
 * Automated background tasks powered by node-cron.
 * Provides automated SQLite backups, backup rotation,
 * cache hygiene sweeps, and system health metrics.
 */

const cron         = require('node-cron');
const fs           = require('fs');
const path         = require('path');
const dbManager    = require('../models/db');
const cacheService = require('./cache.service');
const studentStore = require('../models/student.store');
const userStore    = require('../models/user.store');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'data', 'backups');
const MAX_BACKUPS = 5;

let scheduledJobs = [];

/**
 * Ensure backup folder exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Executes a full database backup and rotates older backups
 */
function runDatabaseBackup() {
  ensureBackupDir();
  const db = dbManager.getDb();
  if (!db) {
    throw new Error('Cannot perform backup: Database is not initialized.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.sqlite`;
  const filePath = path.join(BACKUP_DIR, filename);

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(filePath, buffer);

  // Rotate old backups keeping latest MAX_BACKUPS
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
    .map(f => ({
      name: f,
      fullPath: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const item of toDelete) {
      try {
        fs.unlinkSync(item.fullPath);
      } catch (err) {
        console.warn(`[CRON] Failed to delete old backup ${item.name}:`, err.message);
      }
    }
  }

  const remaining = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'));

  return {
    success: true,
    filename,
    filePath,
    sizeBytes: buffer.length,
    totalBackups: remaining.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Returns list of available database backups
 */
function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Cache hygiene sweep
 */
function runCacheHygiene() {
  const stats = cacheService.getStats();
  return {
    success: true,
    action: 'Cache Hygiene Evaluated',
    hits: stats.hits,
    misses: stats.misses,
    activeKeys: stats.keys,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates live system telemetry and health metrics
 */
function getSystemMetrics() {
  const mem = process.memoryUsage();
  const backups = listBackups();
  let dbSizeBytes = 0;
  const dbFile = path.join(__dirname, '..', '..', 'data', 'students.sqlite');

  if (fs.existsSync(dbFile)) {
    try {
      dbSizeBytes = fs.statSync(dbFile).size;
    } catch (e) {
      dbSizeBytes = 0;
    }
  }

  return {
    status: 'HEALTHY',
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssMB: (mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(1),
    },
    database: {
      engine: 'SQLite (sql.js / WebAssembly)',
      sizeBytes: dbSizeBytes,
      studentsCount: studentStore.getAll().length,
      usersCount: userStore.count(),
    },
    backups: {
      count: backups.length,
      latest: backups.length > 0 ? backups[0] : null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Initialize recurring cron schedules (non-test environments)
 */
function initCronJobs() {
  if (process.env.NODE_ENV === 'test') {
    return { scheduled: false, message: 'Cron background timers skipped in test mode.' };
  }

  // 1. Nightly Database Backup (2:00 AM)
  const backupJob = cron.schedule('0 2 * * *', () => {
    try {
      const res = runDatabaseBackup();
      console.log(`[CRON] Nightly SQLite backup completed: ${res.filename} (${res.sizeBytes} bytes)`);
    } catch (err) {
      console.error('[CRON] Nightly backup failed:', err.message);
    }
  });

  // 2. Hourly Cache Telemetry Check (At minute 0)
  const cacheJob = cron.schedule('0 * * * *', () => {
    try {
      const res = runCacheHygiene();
      console.log(`[CRON] Hourly cache hygiene check: ${res.activeKeys} keys active`);
    } catch (err) {
      console.error('[CRON] Cache hygiene check failed:', err.message);
    }
  });

  scheduledJobs = [backupJob, cacheJob];
  return { scheduled: true, jobCount: scheduledJobs.length };
}

/**
 * Stop all active cron jobs (useful for clean teardown)
 */
function stopAllJobs() {
  for (const job of scheduledJobs) {
    if (job && job.stop) {
      job.stop();
    }
  }
  scheduledJobs = [];
}

module.exports = {
  runDatabaseBackup,
  listBackups,
  runCacheHygiene,
  getSystemMetrics,
  initCronJobs,
  stopAllJobs,
  BACKUP_DIR,
};
