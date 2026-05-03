import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calcNodeRates,
  ratePerMachine,
  machinesNeededFor,
  fractionalMachinesNeeded,
  edgeSufficiencyColor,
  calcSplitterDistribution,
} from '../lib/flowCalc'
import type { MachineNodeData } from '../lib/types/store'
import type { Machine, MultiMachine, ParsedRecipe } from '../lib/types/game'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CONSTRUCTOR: Machine = { name: 'Constructor', tier: '0-1', averagePower: 4, maxProductionShards: 0 }
const MINER_MK1: Machine = { name: 'Miner Mk.1', tier: '0-1', averagePower: 5, maxProductionShards: 0 }
const REFINERY: Machine = { name: 'Refinery', tier: '0-3', averagePower: 30, maxProductionShards: 0 }

const IRON_INGOT_RECIPE: ParsedRecipe = {
  name: 'Iron Ingot',
  machine: 'Smelter',
  batchTime: 2, // 30 per minute at 1x clock
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Ore', amount: 1 }],
  outputs: [{ part: 'Iron Ingot', amount: 1 }],
}

const SCREW_RECIPE: ParsedRecipe = {
  name: 'Screw',
  machine: 'Constructor',
  batchTime: 6, // 10 screws/min input, 40 screws/min output
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Rod', amount: 1 }],
  outputs: [{ part: 'Screw', amount: 4 }],
}

// Multi-output recipe: 3 crude oil/6s → 2 rubber + 2 heavy oil residue
const RUBBER_RECIPE: ParsedRecipe = {
  name: 'Rubber',
  machine: 'Refinery',
  batchTime: 6,
  tier: '0-3',
  alternate: false,
  inputs: [{ part: 'Crude Oil', amount: 3 }],
  outputs: [{ part: 'Rubber', amount: 2 }, { part: 'Heavy Oil Residue', amount: 2 }],
}

const MINER_MULTI: MultiMachine = {
  name: 'Miner',
  showPpm: true,
  defaultMax: 1,
  machines: [
    { name: 'Miner Mk.1', partsRatio: 60, isDefault: true },
    { name: 'Miner Mk.2', partsRatio: 120, isDefault: false },
  ],
  capacities: [
    { name: 'Normal', partsRatio: 1, isDefault: true },
    { name: 'Pure', partsRatio: 2, isDefault: false },
  ],
}

// Ore field recipe used by miner (single output, no inputs)
const IRON_ORE_RECIPE: ParsedRecipe = {
  name: 'Iron Ore',
  machine: 'Miner',
  batchTime: 1,
  tier: '0-0',
  alternate: false,
  inputs: [],
  outputs: [{ part: 'Iron Ore', amount: 1 }],
}

function makeData(overrides: Partial<MachineNodeData> = {}): MachineNodeData {
  return {
    machine: CONSTRUCTOR,
    recipe: IRON_INGOT_RECIPE,
    availableRecipes: [IRON_INGOT_RECIPE],
    nMachines: 1,
    clockSpeed: 1.0,
    ...overrides,
  }
}

// ─── calcNodeRates ────────────────────────────────────────────────────────────

test('calcNodeRates: single-machine at 1x clock', () => {
  const rates = calcNodeRates(makeData(), [])
  // multiplier = (60/2) * 1 * 1.0 = 30
  assert.deepEqual(rates, { inputs: [30], outputs: [30] })
})

test('calcNodeRates: scales linearly with nMachines', () => {
  const rates = calcNodeRates(makeData({ nMachines: 3 }), [])
  assert.deepEqual(rates, { inputs: [90], outputs: [90] })
})

test('calcNodeRates: scales linearly with clockSpeed', () => {
  const rates = calcNodeRates(makeData({ clockSpeed: 2.5 }), [])
  assert.deepEqual(rates, { inputs: [75], outputs: [75] })
})

test('calcNodeRates: fractional clockSpeed', () => {
  const rates = calcNodeRates(makeData({ clockSpeed: 0.5 }), [])
  assert.deepEqual(rates, { inputs: [15], outputs: [15] })
})

test('calcNodeRates: multi-output recipe keeps output ratios', () => {
  const rates = calcNodeRates(
    makeData({ machine: REFINERY, recipe: RUBBER_RECIPE }),
    []
  )
  // multiplier = (60/6) * 1 * 1 = 10
  // inputs: [3 * 10] = [30]
  // outputs: [2 * 10, 2 * 10] = [20, 20]
  assert.deepEqual(rates, { inputs: [30], outputs: [20, 20] })
})

test('calcNodeRates: recipe with 4:1 output-to-input ratio', () => {
  const rates = calcNodeRates(
    makeData({ recipe: SCREW_RECIPE }),
    []
  )
  // multiplier = (60/6) * 1 = 10 → input: 10 iron rods/min, output: 40 screws/min
  assert.deepEqual(rates, { inputs: [10], outputs: [40] })
})

test('calcNodeRates: outputRateOverride sets total output regardless of clock/machines', () => {
  const rates = calcNodeRates(
    makeData({ nMachines: 2, clockSpeed: 2.0, outputRateOverride: 60 }),
    []
  )
  // baseOutputTotal = 1 * (60/2) = 30 per machine
  // scale = 60/30 = 2  → scaledMultiplier = 30 * 2 = 60
  // nMachines and clockSpeed are NOT used for the override path
  assert.deepEqual(rates, { inputs: [60], outputs: [60] })
})

test('calcNodeRates: outputRateOverride scales all outputs proportionally', () => {
  // Override total rubber+residue from 40/min to 80/min
  const rates = calcNodeRates(
    makeData({
      machine: REFINERY,
      recipe: RUBBER_RECIPE,
      outputRateOverride: 80,
    }),
    []
  )
  // baseOutputTotal = (2 + 2) * 10 = 40
  // scale = 80/40 = 2 → scaledMultiplier = 10 * 2 = 20
  assert.deepEqual(rates.outputs, [40, 40])
})

test('calcNodeRates: outputRateOverride ignored when outputs list is empty', () => {
  const emptyOutputRecipe: ParsedRecipe = { ...IRON_INGOT_RECIPE, outputs: [] }
  const rates = calcNodeRates(
    makeData({ recipe: emptyOutputRecipe, outputRateOverride: 100 }),
    []
  )
  // Falls through to normal path (no outputs to scale)
  assert.deepEqual(rates, { inputs: [30], outputs: [] })
})

// ─── calcNodeRates: extractor (MultiMachine) ─────────────────────────────────

test('calcNodeRates: miner uses multiMachine formula, not recipe batchTime', () => {
  const rates = calcNodeRates(
    makeData({
      machine: MINER_MK1,
      recipe: IRON_ORE_RECIPE,
      nMachines: 1,
      clockSpeed: 1.0,
      // default variant (Mk.1 partsRatio=60) + Normal capacity (partsRatio=1)
    }),
    [MINER_MULTI]
  )
  // ppm = 60 * 1 * 1 * 1 = 60
  assert.deepEqual(rates, { inputs: [], outputs: [60] })
})

test('calcNodeRates: miner with 2 machines doubles output', () => {
  const rates = calcNodeRates(
    makeData({ machine: MINER_MK1, recipe: IRON_ORE_RECIPE, nMachines: 2, clockSpeed: 1.0 }),
    [MINER_MULTI]
  )
  // ppm = 60 * 1 * 2 * 1 = 120
  assert.deepEqual(rates, { inputs: [], outputs: [120] })
})

test('calcNodeRates: miner with Pure node capacity doubles output', () => {
  const rates = calcNodeRates(
    makeData({
      machine: MINER_MK1,
      recipe: IRON_ORE_RECIPE,
      nMachines: 1,
      clockSpeed: 1.0,
      minerCapacity: 'Pure',
    }),
    [MINER_MULTI]
  )
  // ppm = 60 * 2 * 1 * 1 = 120
  assert.deepEqual(rates, { inputs: [], outputs: [120] })
})

test('calcNodeRates: miner Mk.2 variant doubles partsRatio', () => {
  const rates = calcNodeRates(
    makeData({
      machine: MINER_MK1,
      recipe: IRON_ORE_RECIPE,
      nMachines: 1,
      clockSpeed: 1.0,
      minerVariant: 'Miner Mk.2',
    }),
    [MINER_MULTI]
  )
  // ppm = 120 * 1 * 1 * 1 = 120
  assert.deepEqual(rates, { inputs: [], outputs: [120] })
})

test('calcNodeRates: miner outputRateOverride bypasses formula', () => {
  const rates = calcNodeRates(
    makeData({
      machine: MINER_MK1,
      recipe: IRON_ORE_RECIPE,
      nMachines: 1,
      clockSpeed: 1.0,
      outputRateOverride: 999,
    }),
    [MINER_MULTI]
  )
  assert.deepEqual(rates, { inputs: [], outputs: [999] })
})

test('calcNodeRates: non-extractor machine ignores multiMachines list', () => {
  const rates = calcNodeRates(makeData(), [MINER_MULTI])
  assert.deepEqual(rates, { inputs: [30], outputs: [30] })
})

// ─── ratePerMachine ───────────────────────────────────────────────────────────

test('ratePerMachine: output rate for normal recipe', () => {
  const rate = ratePerMachine(makeData(), [], 'output', 0)
  // (1/2) * 60 * 1.0 = 30
  assert.equal(rate, 30)
})

test('ratePerMachine: input rate for normal recipe', () => {
  const rate = ratePerMachine(makeData(), [], 'input', 0)
  assert.equal(rate, 30)
})

test('ratePerMachine: input rate for extractor is always 0', () => {
  const rate = ratePerMachine(
    makeData({ machine: MINER_MK1, recipe: IRON_ORE_RECIPE }),
    [MINER_MULTI],
    'input',
    0
  )
  assert.equal(rate, 0)
})

test('ratePerMachine: extractor output rate uses partsRatio * capacity * clockSpeed (not nMachines)', () => {
  const rate = ratePerMachine(
    makeData({ machine: MINER_MK1, recipe: IRON_ORE_RECIPE, nMachines: 5, clockSpeed: 1.5 }),
    [MINER_MULTI],
    'output',
    0
  )
  // partsRatio=60 * capacity=1 * clock=1.5 = 90 (nMachines not used here)
  assert.equal(rate, 90)
})

test('ratePerMachine: handles out-of-bounds handleIdx gracefully', () => {
  const rate = ratePerMachine(makeData(), [], 'output', 99)
  assert.equal(rate, 0)
})

test('ratePerMachine: clockSpeed scales rate', () => {
  const rate = ratePerMachine(makeData({ clockSpeed: 2.0 }), [], 'output', 0)
  assert.equal(rate, 60)
})

// ─── machinesNeededFor ────────────────────────────────────────────────────────

test('machinesNeededFor: exact multiple', () => {
  assert.equal(machinesNeededFor(30, 90), 3)
})

test('machinesNeededFor: fractional demand rounds up', () => {
  assert.equal(machinesNeededFor(30, 31), 2)
})

test('machinesNeededFor: zero ratePerOne returns 0', () => {
  assert.equal(machinesNeededFor(0, 90), 0)
})

test('machinesNeededFor: zero target returns 0 machines needed', () => {
  assert.equal(machinesNeededFor(30, 0), 0)
})

// ─── fractionalMachinesNeeded ─────────────────────────────────────────────────

test('fractionalMachinesNeeded: exact', () => {
  assert.equal(fractionalMachinesNeeded(30, 90), 3)
})

test('fractionalMachinesNeeded: fractional result', () => {
  assert.equal(fractionalMachinesNeeded(30, 45), 1.5)
})

test('fractionalMachinesNeeded: zero ratePerOne returns 0', () => {
  assert.equal(fractionalMachinesNeeded(0, 90), 0)
})

// ─── edgeSufficiencyColor ─────────────────────────────────────────────────────

test('edgeSufficiencyColor: zero demand returns slate (no consumer)', () => {
  assert.equal(edgeSufficiencyColor(100, 0), '#64748b')
})

test('edgeSufficiencyColor: exactly met demand returns green', () => {
  assert.equal(edgeSufficiencyColor(100, 100), '#22c55e')
})

test('edgeSufficiencyColor: oversupply returns green', () => {
  assert.equal(edgeSufficiencyColor(200, 100), '#22c55e')
})

test('edgeSufficiencyColor: exactly 50% supply returns amber', () => {
  assert.equal(edgeSufficiencyColor(50, 100), '#f59e0b')
})

test('edgeSufficiencyColor: between 50% and 100% returns amber', () => {
  assert.equal(edgeSufficiencyColor(75, 100), '#f59e0b')
})

test('edgeSufficiencyColor: below 50% returns red', () => {
  assert.equal(edgeSufficiencyColor(49, 100), '#ef4444')
})

test('edgeSufficiencyColor: zero supply with positive demand is red', () => {
  assert.equal(edgeSufficiencyColor(0, 100), '#ef4444')
})

// ─── calcSplitterDistribution ─────────────────────────────────────────────────

test('calcSplitterDistribution: empty outputs returns empty array', () => {
  assert.deepEqual(calcSplitterDistribution(60, []), [])
})

test('calcSplitterDistribution: all unlimited outputs split equally', () => {
  const result = calcSplitterDistribution(60, [Infinity, Infinity, Infinity])
  assert.deepEqual(result, [20, 20, 20])
})

test('calcSplitterDistribution: demand-limited outputs saturate, rest gets remainder', () => {
  // [8, 10] saturate; Infinity gets 60-8-10=42
  const result = calcSplitterDistribution(60, [8, 10, Infinity])
  assert.equal(result[0], 8)
  assert.equal(result[1], 10)
  assert.equal(result[2], 42)
})

test('calcSplitterDistribution: all finite demands, supply equals total demand', () => {
  const result = calcSplitterDistribution(30, [10, 10, 10])
  assert.deepEqual(result, [10, 10, 10])
})

test('calcSplitterDistribution: supply less than total demand splits proportionally', () => {
  const result = calcSplitterDistribution(15, [10, 10])
  // Neither saturates (demand=10 > share=7.5), both get equal share
  assert.deepEqual(result, [7.5, 7.5])
})

test('calcSplitterDistribution: supply more than demand — excess is lost', () => {
  const result = calcSplitterDistribution(60, [10, 10])
  assert.deepEqual(result, [10, 10])
  // 40 units are lost (not redistributed because no unlimited slot)
  assert.equal(result.reduce((s, v) => s + v, 0), 20)
})

test('calcSplitterDistribution: zero supply', () => {
  const result = calcSplitterDistribution(0, [10, 10])
  assert.deepEqual(result, [0, 0])
})

test('calcSplitterDistribution: single unlimited output gets all supply', () => {
  const result = calcSplitterDistribution(60, [Infinity])
  assert.deepEqual(result, [60])
})

test('calcSplitterDistribution: one low-demand + two unlimited — low saturates first', () => {
  const result = calcSplitterDistribution(15, [3, Infinity, Infinity])
  // iter 0: share=5, slot 0 saturates (3<=5). remaining=12
  // iter 1: freeSlots=2, share=6, both Infinity > 6 → each gets 6
  assert.deepEqual(result, [3, 6, 6])
  assert.equal(result.reduce((s, v) => s + v, 0), 15)
})

test('calcSplitterDistribution: two low-demand slots saturate in same iteration', () => {
  // share=20, both 10-demand slots saturate simultaneously
  const result = calcSplitterDistribution(60, [10, 10, Infinity])
  assert.equal(result[0], 10)
  assert.equal(result[1], 10)
  assert.equal(result[2], 40) // remainder goes to unlimited
})
