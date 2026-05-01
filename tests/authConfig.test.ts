import test from 'node:test'
import assert from 'node:assert/strict'

test('auth config exports', async () => {
  const mod = await import('../lib/server/auth')
  assert.equal(typeof mod.authOptions, 'object')
})

