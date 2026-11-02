/**
 * Express HTTP API Integration Tests
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../../app');

let server;
let baseUrl;

before(async () => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

describe('API Health & Gateway Integration Tests', () => {
  it('GET /health should return 200 UP status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'UP');
    assert.strictEqual(body.service, 'paybuddy-api');
    assert.strictEqual(typeof body.uptime, 'number');
  });

  it('GET /api/v1/health should also return 200 UP status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'UP');
  });

  it('GET /api/v1/non-existent-route should return 404 with RFC 7807 problem details', async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.message.includes('not found'));
  });

  it('POST /api/v1/auth/register with missing fields should return 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Alice' }) // missing email, phone, password
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.error.details));
  });
});
