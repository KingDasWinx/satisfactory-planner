import test from 'node:test'
import assert from 'node:assert/strict'

test('me forks API exports GET', async () => {
  const mod = await import('../app/api/me/forks/route')
  assert.equal(typeof mod.GET, 'function')
})

