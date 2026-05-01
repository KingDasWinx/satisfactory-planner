import test from 'node:test'
import assert from 'node:assert/strict'

test('NEXT_PUBLIC_PERSISTENCE_MODE default é local', () => {
  const mode = process.env.NEXT_PUBLIC_PERSISTENCE_MODE ?? 'local'
  assert.equal(mode, 'local')
})

