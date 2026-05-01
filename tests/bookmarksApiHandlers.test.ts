import test from 'node:test'
import assert from 'node:assert/strict'

test('bookmarks APIs export handlers', async () => {
  const bookmark = await import('../app/api/projects/[id]/bookmark/route')
  const meBookmarks = await import('../app/api/me/bookmarks/route')
  assert.equal(typeof bookmark.POST, 'function')
  assert.equal(typeof bookmark.DELETE, 'function')
  assert.equal(typeof meBookmarks.GET, 'function')
})

