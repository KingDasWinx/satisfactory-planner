import test from 'node:test'
import assert from 'node:assert/strict'

import { migrateIndex, STORAGE_INDEX } from '@/lib/utils/projectStorage'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

test('migra ProjectMeta antigo para incluir defaults', () => {
  const storage = new MemoryStorage()
  storage.setItem(STORAGE_INDEX, JSON.stringify([{ id: '1', name: 'A', createdAt: 1, updatedAt: 1 }]))

  const migrated = migrateIndex(storage as unknown as Storage)
  assert.equal(migrated[0].description, '')
  assert.equal(migrated[0].isPublic, false)
})

