/**
 * Server Lifecycle & Graceful Shutdown
 */

const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Start listening
server.listen(config.port, () => {
  logger.info(`PayBuddy Backend Server initialized in [${config.env}] mode`);
  logger.info(`Listening on port ${config.port} | Health check: http://localhost:${config.port}/health`);
});

// Handle graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    // Gracefully close MySQL connection pool if initialized
    try {
      const db = require('./config/database');
      if (db && db.pool) {
        await db.pool.end();
        logger.info('Database connection pool drained and closed.');
      }
    } catch (err) {
      // Database might not have been loaded yet
    }

    logger.info('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception!', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('CRITICAL: Unhandled Promise Rejection!', { reason });
});

module.exports = server;
