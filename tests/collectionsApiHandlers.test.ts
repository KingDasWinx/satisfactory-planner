import test from 'node:test'
import assert from 'node:assert/strict'

test('collections APIs export handlers', async () => {
  const root = await import('../app/api/me/collections/route')
  const item = await import('../app/api/me/collections/[collectionId]/route')
  const items = await import('../app/api/me/collections/[collectionId]/items/route')
  assert.equal(typeof root.GET, 'function')
  assert.equal(typeof root.POST, 'function')
  assert.equal(typeof item.PATCH, 'function')
  assert.equal(typeof item.DELETE, 'function')
  assert.equal(typeof items.POST, 'function')
  assert.equal(typeof items.DELETE, 'function')
})

