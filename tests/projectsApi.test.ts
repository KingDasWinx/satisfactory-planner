import test from 'node:test'
import assert from 'node:assert/strict'

test('GET /api/projects retorna handler', async () => {
  const mod = await import('../app/api/projects/route')
  assert.equal(typeof mod.GET, 'function')
})

