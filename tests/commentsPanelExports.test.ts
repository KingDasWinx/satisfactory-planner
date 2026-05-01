import test from 'node:test'
import assert from 'node:assert/strict'

test('CommentsPanel exports component', async () => {
  const mod = await import('../components/community/CommentsPanel')
  assert.equal(typeof mod.CommentsPanel, 'function')
})

