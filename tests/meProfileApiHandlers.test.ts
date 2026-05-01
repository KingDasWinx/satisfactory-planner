import test from 'node:test'
import assert from 'node:assert/strict'

test('me profile API exports PUT', async () => {
  const mod = await import('../app/api/me/profile/route')
  assert.equal(typeof mod.PUT, 'function')
})

