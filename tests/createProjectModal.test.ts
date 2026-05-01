import test from 'node:test'
import assert from 'node:assert/strict'

test('CreateProjectModal module exports', async () => {
  const mod = await import('../components/home/CreateProjectModal')
  assert.equal(typeof mod.CreateProjectModal, 'function')
})

