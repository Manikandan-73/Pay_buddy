/**
 * PayBuddy Structured Logger
 * Provides standardized timestamped logs with context and level separation
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.keys(context).length > 0 ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

const logger = {
  error: (message, context = {}) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, context));
  },
  warn: (message, context = {}) => {
    console.warn(formatMessage(LOG_LEVELS.WARN, message, context));
  },
  info: (message, context = {}) => {
    console.log(formatMessage(LOG_LEVELS.INFO, message, context));
  },
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, context));
    }
  }
};

module.exports = logger;
