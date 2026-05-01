import test from 'node:test'
import assert from 'node:assert/strict'

test('comments APIs export handlers', async () => {
  const root = await import('../app/api/projects/[id]/comments/route')
  const item = await import('../app/api/projects/[id]/comments/[commentId]/route')
  assert.equal(typeof root.GET, 'function')
  assert.equal(typeof root.POST, 'function')
  assert.equal(typeof item.DELETE, 'function')
})

