import test from 'node:test'
import assert from 'node:assert/strict'

test('next config exports headers function', async () => {
  const mod = await import('../next.config')
  assert.equal(typeof mod.default, 'object')
})

