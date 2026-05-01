import test from 'node:test'
import assert from 'node:assert/strict'

test('CollectionsPanel exports component', async () => {
  const mod = await import('../components/me/CollectionsPanel')
  assert.equal(typeof mod.CollectionsPanel, 'function')
})

