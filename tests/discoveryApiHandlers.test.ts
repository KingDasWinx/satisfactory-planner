import test from 'node:test'
import assert from 'node:assert/strict'

test('discovery MVP APIs export handlers', async () => {
  const meTags = await import('../app/api/me/tags/route')
  assert.equal(typeof meTags.GET, 'function')
  assert.equal(typeof meTags.PUT, 'function')
})

