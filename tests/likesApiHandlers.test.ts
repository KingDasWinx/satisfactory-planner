import test from 'node:test'
import assert from 'node:assert/strict'

test('likes APIs export handlers', async () => {
  const like = await import('../app/api/projects/[id]/like/route')
  const likes = await import('../app/api/projects/[id]/likes/route')
  assert.equal(typeof like.POST, 'function')
  assert.equal(typeof like.DELETE, 'function')
  assert.equal(typeof likes.GET, 'function')
})

