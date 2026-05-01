import test from 'node:test'
import assert from 'node:assert/strict'

test('normalizeUsername', async () => {
  const { normalizeUsername } = await import('../lib/server/usernames')
  assert.equal(normalizeUsername('@King_Das'), 'king_das')
  assert.equal(normalizeUsername('ab'), null)
  assert.equal(normalizeUsername('a-b'), null)
})

