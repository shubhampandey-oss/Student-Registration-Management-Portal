'use strict';

/**
 * scripts/backup.js
 * Manual CLI backup runner for SQLite database.
 * Run via: npm run backup
 */

require('dotenv').config();

const dbManager   = require('../src/models/db');
const cronService = require('../src/services/cron.service');

async function main() {
  console.log('🔄 Initializing database for backup...');
  await dbManager.ensureDbReady();

  console.log('💾 Running SQLite database backup...');
  const result = cronService.runDatabaseBackup();

  console.log('\n✅ Database Backup Successful!');
  console.log(`   Filename      : ${result.filename}`);
  console.log(`   Path          : ${result.filePath}`);
  console.log(`   Size          : ${(result.sizeBytes / 1024).toFixed(2)} KB`);
  console.log(`   Total Backups : ${result.totalBackups}`);
  console.log(`   Timestamp     : ${result.timestamp}\n`);
}

main().catch(err => {
  console.error('\n❌ Backup failed:', err.message);
  process.exit(1);
});
