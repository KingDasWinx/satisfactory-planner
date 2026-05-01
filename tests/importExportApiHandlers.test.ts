import test from 'node:test'
import assert from 'node:assert/strict'

test('me projects import/export APIs export handlers', async () => {
  const imp = await import('../app/api/me/projects/import/route')
  const exp = await import('../app/api/me/projects/export/route')
  assert.equal(typeof imp.POST, 'function')
  assert.equal(typeof exp.GET, 'function')
})

