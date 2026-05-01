import test from 'node:test'
import assert from 'node:assert/strict'

test('LikeButton exports component', async () => {
  const mod = await import('../components/community/LikeButton')
  assert.equal(typeof mod.LikeButton, 'function')
})

