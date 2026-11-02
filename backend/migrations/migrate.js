/**
 * Automated Database Migration Runner
 * Executes sequential SQL migrations and tracks state in schema_migrations
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/env');
const logger = require('../utils/logger');

async function runMigrations() {
  logger.info('Starting database migration runner...');

  // Step 1: Connect to MySQL server (without specifying DB in case it doesn't exist yet)
  const rootConn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    logger.info(`Database '${config.db.database}' verified/created.`);
  } finally {
    await rootConn.end();
  }

  // Step 2: Connect to target database
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true
  });

  try {
    // Step 3: Create schema_migrations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Step 4: Get list of already applied migrations
    const [appliedRows] = await connection.query('SELECT migration_name FROM schema_migrations;');
    const applied = new Set(appliedRows.map(r => r.migration_name));

    // Step 5: Read migration files
    const migrationsDir = path.resolve(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration file(s).`);

    for (const file of files) {
      if (applied.has(file)) {
        logger.info(`Migration '${file}' already applied. Skipping.`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (migration_name) VALUES (?);', [file]);
        await connection.commit();
        logger.info(`SUCCESS: Migration '${file}' applied.`);
      } catch (err) {
        await connection.rollback();
        logger.error(`FAILED: Migration '${file}' failed: ${err.message}`);
        throw err;
      }
    }

    logger.info('All migrations completed successfully.');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runMigrations;
