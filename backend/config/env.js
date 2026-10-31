/**
 * Environment Configuration & Fail-Fast Validator
 * Ensures all required environment variables are present and well-formed before server startup.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

function validateEnv() {
  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('FATAL CONFIGURATION ERROR: Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('Please check your .env file against .env.example.');
    process.exit(1);
  }
}

// In development, auto-validate on import
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://127.0.0.1:5500,http://localhost:5500').split(','),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_replace_in_prod_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev_insecure_refresh_secret_replace_in_prod_12345',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'paybuddy_user',
    password: process.env.DB_PASSWORD || 'paybuddy_password',
    database: process.env.DB_NAME || 'paybuddy_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0,
    waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false'
  },
  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS, 10) || 86400
  }
};
