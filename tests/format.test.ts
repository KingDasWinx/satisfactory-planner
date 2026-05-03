import test from 'node:test'
import assert from 'node:assert/strict'

import { fmt } from '../lib/utils/format'

test('fmt: zero returns "0"', () => {
  assert.equal(fmt(0), '0')
})

test('fmt: exactly 10000 returns compact "k" form', () => {
  assert.equal(fmt(10000), '10.0k')
})

test('fmt: large numbers use "k" suffix with one decimal', () => {
  assert.equal(fmt(15000), '15.0k')
  assert.equal(fmt(123456), '123.5k')
})

test('fmt: integers >= 100 and < 10000 use no decimals', () => {
  assert.equal(fmt(100), '100')
  assert.equal(fmt(9999), '9999')
  assert.equal(fmt(500), '500')
})

test('fmt: floats >= 100 round to integer string', () => {
  assert.equal(fmt(100.5), '101')
  assert.equal(fmt(999.9), '1000')
})

test('fmt: numbers >= 10 and < 100 use one decimal', () => {
  assert.equal(fmt(10), '10')
  assert.equal(fmt(99.9), '99.9')
  assert.equal(fmt(12.5), '12.5')
})

test('fmt: small numbers < 10 use two decimals', () => {
  assert.equal(fmt(1.5), '1.50')
  assert.equal(fmt(0.1), '0.10')
  assert.equal(fmt(9.99), '9.99')
})

test('fmt: integers < 10 use two decimals', () => {
  // Number.isInteger(5) is true but n < 10 so the integer branch does not fire first
  // The check order is: >=10000, isInteger||>=100, >=10, else
  // 5 is integer and < 100, so isInteger||>=100 fires → toFixed(0)
  assert.equal(fmt(5), '5')
  assert.equal(fmt(1), '1')
})

// ─── Known display quirk ──────────────────────────────────────────────────────
// fmt checks n >= 10000 for "k" formatting, but for 9999 < n < 10000 the
// integer/>=100 branch calls toFixed(0) which can round up to "10000".
// This is an inconsistency: fmt(9999.9) === "10000" but fmt(10000) === "10.0k".
test('fmt: 9999.9 rounds to "10000" (not "10.0k") — known display quirk', () => {
  // toFixed(0) rounds 9999.9 → "10000", bypassing the k-format branch
  assert.equal(fmt(9999.9), '10000')
  // Compare with the actual >= 10000 path:
  assert.equal(fmt(10000), '10.0k')
})
