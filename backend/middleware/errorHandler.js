/**
 * Centralized Error Handling Middleware (RFC 7807 Compliant)
 */

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal error occurred';
  let details = err.details || null;

  // Log all non-operational errors or 500 errors
  if (!err.isOperational || statusCode >= 500) {
    logger.error(`Unhandled Server Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.warn(`Operational Error: [${errorCode}] ${message}`, {
      url: req.originalUrl,
      method: req.method,
      details
    });
  }

  // Hide internal stack details from client in production
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: statusCode >= 500 && process.env.NODE_ENV === 'production' 
        ? 'A system error occurred. Please try again later.' 
        : message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  };

  res.status(statusCode).json(response);
}

module.exports = {
  AppError,
  errorHandler
};
