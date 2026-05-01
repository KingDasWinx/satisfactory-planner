import test from 'node:test'
import assert from 'node:assert/strict'

test('BookmarkButton exports component', async () => {
  const mod = await import('../components/community/BookmarkButton')
  assert.equal(typeof mod.BookmarkButton, 'function')
})

