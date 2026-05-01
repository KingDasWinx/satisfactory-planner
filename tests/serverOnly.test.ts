import test from 'node:test'
import assert from 'node:assert/strict'

test('server prisma wrapper exports', async () => {
  const mod = await import('../lib/server/prisma')
  assert.ok(mod.prisma)
})

