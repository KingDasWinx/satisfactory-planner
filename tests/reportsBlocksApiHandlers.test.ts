import test from 'node:test'
import assert from 'node:assert/strict'

test('reports + blocks APIs export handlers', async () => {
  const reports = await import('../app/api/reports/route')
  const block = await import('../app/api/users/[username]/block/route')
  assert.equal(typeof reports.POST, 'function')
  assert.equal(typeof block.POST, 'function')
  assert.equal(typeof block.DELETE, 'function')
})

