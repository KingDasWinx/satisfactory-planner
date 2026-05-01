import test from 'node:test'
import assert from 'node:assert/strict'

test('prisma client wrapper exports', async () => {
  const mod = await import('../lib/db/prisma')
  assert.ok(mod.prisma)
})

