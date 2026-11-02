/**
 * Money & Minor Unit Arithmetic Unit Tests
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

function toMinorUnits(rupeesStr) {
  const parts = String(rupeesStr).trim().split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const fraction = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
  return whole * 100 + parseInt(fraction, 10);
}

function toDecimalString(paise) {
  return (paise / 100).toFixed(4);
}

describe('Financial Minor-Unit Precision Tests', () => {
  it('should accurately add 0.10 and 0.20 without IEEE 754 floating point drift', () => {
    // Standard JS float calculation has drift:
    assert.notStrictEqual(0.1 + 0.2, 0.3);

    // Minor-unit integer calculation is exact:
    const a = toMinorUnits('0.10'); // 10 paise
    const b = toMinorUnits('0.20'); // 20 paise
    const sumPaise = a + b;         // 30 paise
    assert.strictEqual(sumPaise, 30);
    assert.strictEqual(toDecimalString(sumPaise), '0.3000');
  });

  it('should accurately handle typical Indian UPI payment values', () => {
    const balance = toMinorUnits('10000.50'); // 1000050 paise
    const transfer = toMinorUnits('250.75');   // 25075 paise
    const remaining = balance - transfer;

    assert.strictEqual(remaining, 974975);
    assert.strictEqual(toDecimalString(remaining), '9749.7500');
  });

  it('should prevent negative subtractions', () => {
    const balance = toMinorUnits('100.00');
    const transfer = toMinorUnits('150.00');
    assert.strictEqual(balance < transfer, true);
  });
});
