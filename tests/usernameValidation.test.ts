import test from 'node:test'
import assert from 'node:assert/strict'

test('schema includes username and Follow', async () => {
  const fs = await import('node:fs/promises')
  const schema = await fs.readFile('prisma/schema.prisma', 'utf8')
  assert.ok(schema.includes('username'))
  assert.ok(schema.includes('model Follow'))
})

