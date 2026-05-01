import test from 'node:test'
import assert from 'node:assert/strict'

test('projects handlers export', async () => {
  const list = await import('../app/api/projects/route')
  const item = await import('../app/api/projects/[id]/route')
  assert.equal(typeof list.GET, 'function')
  assert.equal(typeof list.POST, 'function')
  assert.equal(typeof item.GET, 'function')
  assert.equal(typeof item.PUT, 'function')
})

