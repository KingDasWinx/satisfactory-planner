import test from 'node:test'
import assert from 'node:assert/strict'

test('gamification MVP API exports GET', async () => {
  const mod = await import('../app/api/me/stats/route')
  assert.equal(typeof mod.GET, 'function')
})

