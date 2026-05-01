import test from 'node:test'
import assert from 'node:assert/strict'

test('featured APIs export handlers', async () => {
  const me = await import('../app/api/me/featured/route')
  const pub = await import('../app/api/users/[username]/featured/route')
  assert.equal(typeof me.GET, 'function')
  assert.equal(typeof me.POST, 'function')
  assert.equal(typeof me.DELETE, 'function')
  assert.equal(typeof pub.GET, 'function')
})

