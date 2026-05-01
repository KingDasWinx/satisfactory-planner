import test from 'node:test'
import assert from 'node:assert/strict'

test('prisma schema includes User and Project', async () => {
  const fs = await import('node:fs/promises')
  const schema = await fs.readFile('prisma/schema.prisma', 'utf8')
  assert.ok(schema.includes('model User'))
  assert.ok(schema.includes('model Project'))
})

