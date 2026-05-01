import test from 'node:test'
import assert from 'node:assert/strict'

test('profile API exports GET', async () => {
  const mod = await import('../app/api/users/[username]/route')
  assert.equal(typeof mod.GET, 'function')
})

test('profile projects API exports GET', async () => {
  const mod = await import('../app/api/users/[username]/projects/route')
  assert.equal(typeof mod.GET, 'function')
})

