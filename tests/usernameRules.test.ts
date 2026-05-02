import test from 'node:test'
import assert from 'node:assert/strict'

test('normalizeUsername', async () => {
  const { normalizeUsername, normalizeUsernameFromRouteParam } = await import('../lib/server/usernames')
  assert.equal(normalizeUsername('@King_Das'), 'king_das')
  assert.equal(normalizeUsername('ab'), null)
  assert.equal(normalizeUsername('a-b'), null)
  assert.equal(normalizeUsernameFromRouteParam('%40haha'), 'haha')
  assert.equal(normalizeUsernameFromRouteParam('%2540haha'), 'haha')
})

