/**
 * MySQL 8 Connection Pool & Transaction Manager (mysql2/promise)
 */

const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: config.db.waitForConnections,
  connectionLimit: config.db.connectionLimit,
  queueLimit: config.db.queueLimit,
  // CRITICAL FINTECH SETTING: Return DECIMAL fields as strings to prevent floating-point distortion
  decimalNumbers: false,
  dateStrings: true,
  timezone: '+00:00'
});

// Helper for single parameterized query
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper to execute work inside an explicit ACID transaction
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      logger.error('Failed to rollback transaction', { error: rollbackErr.message });
    }
    throw err;
  } finally {
    connection.release();
  }
}

// Test database connectivity
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connection successfully established with MySQL 8 pool.');
    connection.release();
    return true;
  } catch (err) {
    logger.error('Failed to connect to MySQL database:', { message: err.message, code: err.code });
    return false;
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection
};
