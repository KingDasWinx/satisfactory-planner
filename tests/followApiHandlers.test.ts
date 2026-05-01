import test from 'node:test'
import assert from 'node:assert/strict'

test('follow API exports POST and DELETE', async () => {
  const mod = await import('../app/api/users/[username]/follow/route')
  assert.equal(typeof mod.POST, 'function')
  assert.equal(typeof mod.DELETE, 'function')
})

