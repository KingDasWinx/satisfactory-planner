import test from 'node:test'
import assert from 'node:assert/strict'

test('public profile page module loads', async () => {
  const mod = await import('../app/u/[username]/page')
  assert.ok(mod)
})

