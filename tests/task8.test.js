'use strict';

/**
 * tests/task8.test.js
 * Automated test suite for Task 8 — Automated Background Tasks & Production Health.
 * Tests node-cron scheduled jobs, on-demand SQLite backup generation,
 * backup file rotation, cache hygiene sweeps, and the system health API.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const fs     = require('node:fs');

// Use isolated test port
process.env.PORT = '3092';
process.env.NODE_ENV = 'test';

const { app, server } = require('../src/app');
const dbManager       = require('../src/models/db');
const cronService     = require('../src/services/cron.service');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3092,
      ...options,
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('Task 8 — Automated Background Tasks & Production Health', () => {

  before(async () => {
    await dbManager.ensureDbReady();
  });

  after(() => {
    cronService.stopAllJobs();
    if (server && server.close) {
      server.close();
    }
  });

  // ── Health API ─────────────────────────────────────────────
  it('GET /api/v1/health returns 200 with system telemetry and UP status', async () => {
    const res = await request({ method: 'GET', path: '/api/v1/health' });
    assert.equal(res.statusCode, 200);

    const json = JSON.parse(res.body);
    assert.equal(json.status, 'UP');
    assert.ok(json.telemetry, 'Telemetry object must be returned');
    assert.equal(json.telemetry.status, 'HEALTHY');
    assert.ok(json.telemetry.memory, 'Memory metrics must be present');
    assert.ok(json.telemetry.database, 'Database telemetry must be present');
    assert.equal(json.telemetry.database.engine, 'SQLite (sql.js / WebAssembly)');
  });

  // ── Database Backup Runner ─────────────────────────────────
  it('cronService.runDatabaseBackup generates valid SQLite backup file on disk', () => {
    const result = cronService.runDatabaseBackup();

    assert.equal(result.success, true);
    assert.ok(result.filename.startsWith('backup_'));
    assert.ok(result.filename.endsWith('.sqlite'));
    assert.ok(fs.existsSync(result.filePath), 'Backup file must exist on disk');
    assert.ok(result.sizeBytes > 0, 'Backup size must be greater than 0');
  });

  it('cronService.listBackups returns sorted list of available backups', () => {
    const backups = cronService.listBackups();
    assert.ok(Array.isArray(backups), 'Backups must be an array');
    assert.ok(backups.length >= 1, 'At least one backup must be present');
    assert.ok(backups[0].filename, 'Backup item must contain filename');
    assert.ok(backups[0].sizeBytes, 'Backup item must contain sizeBytes');
  });

  it('cronService enforces MAX_BACKUPS rotation policy (keeps <= 5 backups)', () => {
    // Generate extra backups to test rotation limit
    for (let i = 0; i < 6; i++) {
      cronService.runDatabaseBackup();
    }

    const backups = cronService.listBackups();
    assert.ok(backups.length <= 5, `Total backups should not exceed 5, found: ${backups.length}`);
  });

  // ── Backup HTTP Endpoints ──────────────────────────────────
  it('GET /api/v1/cron/backups returns backup registry JSON', async () => {
    const res = await request({ method: 'GET', path: '/api/v1/cron/backups' });
    assert.equal(res.statusCode, 200);

    const json = JSON.parse(res.body);
    assert.equal(json.success, true);
    assert.ok(typeof json.count === 'number');
    assert.ok(Array.isArray(json.backups));
  });

  it('POST /api/v1/cron/backup triggers on-demand database backup (201)', async () => {
    const res = await request({ method: 'POST', path: '/api/v1/cron/backup' });
    assert.equal(res.statusCode, 201);

    const json = JSON.parse(res.body);
    assert.equal(json.success, true);
    assert.ok(json.backup.filename);
    assert.ok(json.backup.sizeBytes > 0);
  });

  // ── Cache Hygiene & Telemetry ──────────────────────────────
  it('cronService.runCacheHygiene evaluates telemetry successfully', () => {
    const hygiene = cronService.runCacheHygiene();
    assert.equal(hygiene.success, true);
    assert.ok(typeof hygiene.hits === 'number');
    assert.ok(typeof hygiene.misses === 'number');
    assert.ok(typeof hygiene.activeKeys === 'number');
  });

  it('cronService.getSystemMetrics aggregates complete health metrics', () => {
    const metrics = cronService.getSystemMetrics();
    assert.equal(metrics.status, 'HEALTHY');
    assert.ok(typeof metrics.uptimeSeconds === 'number');
    assert.ok(metrics.memory.heapUsedMB);
    assert.ok(typeof metrics.database.studentsCount === 'number');
    assert.ok(typeof metrics.database.usersCount === 'number');
    assert.ok(typeof metrics.backups.count === 'number');
  });

});
