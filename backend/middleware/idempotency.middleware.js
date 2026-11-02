/**
 * Database-Backed Idempotency Middleware
 * Prevents double-spending and duplicates during network drops and automatic retries
 */

const crypto = require('crypto');
const db = require('../config/database');
const config = require('../config/env');
const { AppError } = require('./errorHandler');

function hashPayload(body) {
  const normalized = JSON.stringify(body || {});
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function idempotency(operationName) {
  return async (req, res, next) => {
    const key = req.headers['x-idempotency-key'];

    if (!key) {
      return next(new AppError('Missing mandatory x-idempotency-key header.', 400, 'MISSING_IDEMPOTENCY_KEY'));
    }

    const userId = req.user.id;
    const requestHash = hashPayload(req.body);

    try {
      // 1. Lookup existing idempotency record
      const sqlLookup = `
        SELECT * FROM idempotency_keys 
        WHERE user_id = ? AND operation = ? AND idempotency_key = ?
        LIMIT 1
      `;
      const [existing] = await db.query(sqlLookup, [userId, operationName, key]);

      if (existing) {
        // If operation is already completed
        if (existing.processing_status === 'COMPLETED') {
          // Check payload hash
          if (existing.request_hash !== requestHash) {
            return next(new AppError(
              'Idempotency key reused with different request payload.',
              409,
              'IDEMPOTENCY_PAYLOAD_MISMATCH'
            ));
          }

          // Return cached response
          res.setHeader('x-cache', 'HIT');
          res.setHeader('x-idempotent-replay', 'true');
          const cachedBody = typeof existing.response_body === 'string' 
            ? JSON.parse(existing.response_body) 
            : existing.response_body;

          return res.status(existing.response_status || 200).json(cachedBody);
        }

        // If operation is currently processing in another concurrent request
        if (existing.processing_status === 'IN_PROGRESS') {
          return next(new AppError(
            'A request with this idempotency key is currently processing. Please wait.',
            409,
            'CONCURRENT_OPERATION_IN_PROGRESS'
          ));
        }
      }

      // 2. Reserve idempotency key in DB with IN_PROGRESS status
      const recordId = `pb_idemp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const expiresAt = new Date(Date.now() + config.idempotency.ttlSeconds * 1000);

      const sqlInsert = `
        INSERT INTO idempotency_keys 
        (id, user_id, operation, idempotency_key, request_hash, processing_status, expires_at)
        VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?)
      `;
      await db.query(sqlInsert, [recordId, userId, operationName, key, requestHash, expiresAt]);

      // 3. Attach hook to response to capture and persist final result
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Asynchronously update idempotency key record upon completion
        const status = res.statusCode >= 200 && res.statusCode < 300 ? 'COMPLETED' : 'FAILED';
        const txId = body?.data?.transaction?.id || body?.data?.id || null;

        db.query(`
          UPDATE idempotency_keys 
          SET processing_status = ?, response_status = ?, response_body = ?, transaction_id = ?
          WHERE id = ?
        `, [status, res.statusCode, JSON.stringify(body), txId, recordId]).catch(err => {
          console.error('Failed to update idempotency key cache:', err.message);
        });

        return originalJson(body);
      };

      next();
    } catch (err) {
      // In case of unique constraint violation (racing insert)
      if (err.code === 'ER_DUP_ENTRY') {
        return next(new AppError(
          'Concurrent request detected with the same idempotency key.',
          409,
          'CONCURRENT_IDEMPOTENCY_CONFLICT'
        ));
      }
      next(err);
    }
  };
}

module.exports = idempotency;
