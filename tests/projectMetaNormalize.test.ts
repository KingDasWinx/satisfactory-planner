import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeProjectMeta } from '@/lib/utils/projectMeta'

test('normalizeProjectMeta aplica defaults', () => {
  const meta = normalizeProjectMeta({ id: '1', name: 'A', createdAt: 1, updatedAt: 1 })
  assert.equal(meta.description, '')
  assert.equal(meta.isPublic, false)
})

