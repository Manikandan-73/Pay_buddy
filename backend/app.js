/**
 * Express Application Setup & Middleware Pipeline
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./utils/logger');
const { AppError, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Cross-Origin Resource Sharing
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigin.includes(origin) || config.corsOrigin.includes('*')) {
      return callback(null, true);
    }
    return callback(new AppError(`Origin ${origin} not allowed by CORS`, 403, 'CORS_ERROR'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));

// 2. Body Parsing
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 3. Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// 4. Base & Health Routes
app.use('/health', require('./routes/health.routes'));
app.use(`${config.apiPrefix}/health`, require('./routes/health.routes'));

// 5. Core API Routes
app.use(`${config.apiPrefix}/auth`, require('./routes/auth.routes'));
app.use(`${config.apiPrefix}/wallets`, require('./routes/wallet.routes'));
app.use(`${config.apiPrefix}/transfers`, require('./routes/transfer.routes'));
app.use(`${config.apiPrefix}/transactions`, require('./routes/transaction.routes'));

// 6. 404 Handler
app.all('*', (req, res, next) => {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// 7. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
