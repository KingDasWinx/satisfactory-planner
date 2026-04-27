import test from 'node:test'
import assert from 'node:assert/strict'

import { partNameToIconPath } from '../lib/utils/iconName'

test('partNameToIconPath converts spaces to underscores', () => {
  assert.equal(partNameToIconPath('Adaptive Control Unit'), '/icons/Adaptive_Control_Unit.png')
})

test('partNameToIconPath keeps dot for Mk.1 style names', () => {
  assert.equal(partNameToIconPath('Miner Mk.1'), '/icons/Miner_Mk.1.png')
})

