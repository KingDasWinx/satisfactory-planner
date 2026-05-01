import test from 'node:test'
import assert from 'node:assert/strict'

test('CommunityPanel exports component', async () => {
  const mod = await import('../components/panels/CommunityPanel')
  assert.equal(typeof mod.CommunityPanel, 'function')
})

