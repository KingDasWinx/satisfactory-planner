import test from 'node:test'
import assert from 'node:assert/strict'

test('followers/following APIs export GET', async () => {
  const followers = await import('../app/api/users/[username]/followers/route')
  const following = await import('../app/api/users/[username]/following/route')
  assert.equal(typeof followers.GET, 'function')
  assert.equal(typeof following.GET, 'function')
})

