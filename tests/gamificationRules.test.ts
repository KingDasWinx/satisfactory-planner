import test from 'node:test'
import assert from 'node:assert/strict'

test('gamification: points table stable', async () => {
  const mod = await import('../lib/server/gamification')
  assert.equal(mod.pointsFor('like_given'), 1)
  assert.equal(mod.pointsFor('comment_created'), 2)
})

