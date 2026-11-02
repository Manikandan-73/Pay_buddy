/**
 * Idempotency Key & Payload Hash Unit Tests
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function hashPayload(body) {
  const normalized = JSON.stringify(body || {});
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

describe('Idempotency Hashing & Replay Safety Tests', () => {
  it('should generate identical SHA-256 hash for identical payloads', () => {
    const payloadA = { receiverWalletId: 'pb_wal_001', amount: '250.00' };
    const payloadB = { receiverWalletId: 'pb_wal_001', amount: '250.00' };

    assert.strictEqual(hashPayload(payloadA), hashPayload(payloadB));
  });

  it('should detect payload tampering or amount change for same key', () => {
    const original = { receiverWalletId: 'pb_wal_001', amount: '250.00' };
    const tampered = { receiverWalletId: 'pb_wal_001', amount: '500.00' };

    assert.notStrictEqual(hashPayload(original), hashPayload(tampered));
  });

  it('should produce 64-character hexadecimal SHA-256 output', () => {
    const hash = hashPayload({ test: 123 });
    assert.strictEqual(hash.length, 64);
    assert.match(hash, /^[a-f0-9]{64}$/);
  });
});
