import test from 'node:test'
import assert from 'node:assert/strict'

import { inferPartsFromUpstream, inferRatesByPartFromUpstream } from '../lib/utils/inferParts'
import type { FactoryNode } from '../lib/types/store'
import type { Edge } from '@xyflow/react'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MACHINE = { name: 'Constructor', tier: '0-1', averagePower: 4, maxProductionShards: 0 }

function machineNode(id: string, outputPart: string, outputIdx = 0): FactoryNode {
  const outputs = new Array(outputIdx + 1).fill(null).map((_, i) => ({
    part: i === outputIdx ? outputPart : 'Unknown',
    amount: 1,
  }))
  return {
    id,
    type: 'machineNode',
    position: { x: 0, y: 0 },
    data: {
      machine: MACHINE,
      recipe: {
        name: outputPart,
        machine: 'Constructor',
        batchTime: 2,
        tier: '0-1',
        alternate: false,
        inputs: [],
        outputs,
      },
      availableRecipes: [],
      nMachines: 1,
      clockSpeed: 1.0,
    },
  }
}

function splitterNode(id: string): FactoryNode {
  return { id, type: 'splitterNode', position: { x: 0, y: 0 }, data: {} }
}

function mergerNode(id: string): FactoryNode {
  return { id, type: 'mergerNode', position: { x: 0, y: 0 }, data: {} }
}

function edge(id: string, source: string, target: string, sh: string, th: string): Edge {
  return { id, source, target, sourceHandle: sh, targetHandle: th }
}

// ─── inferPartsFromUpstream ───────────────────────────────────────────────────

test('inferParts: machine node returns the part at the given output index', () => {
  const nodes: FactoryNode[] = [machineNode('m', 'Iron Ingot')]
  const parts = inferPartsFromUpstream('m', 'out-0', nodes, [])
  assert.deepEqual(parts, ['Iron Ingot'])
})

test('inferParts: machine node with multi-output recipe returns correct indexed part', () => {
  const node: FactoryNode = {
    id: 'm',
    type: 'machineNode',
    position: { x: 0, y: 0 },
    data: {
      machine: MACHINE,
      recipe: {
        name: 'Rubber',
        machine: 'Refinery',
        batchTime: 6,
        tier: '0-3',
        alternate: false,
        inputs: [],
        outputs: [{ part: 'Rubber', amount: 2 }, { part: 'Heavy Oil Residue', amount: 2 }],
      },
      availableRecipes: [],
      nMachines: 1,
      clockSpeed: 1.0,
    },
  }
  assert.deepEqual(inferPartsFromUpstream('m', 'out-0', [node], []), ['Rubber'])
  assert.deepEqual(inferPartsFromUpstream('m', 'out-1', [node], []), ['Heavy Oil Residue'])
})

test('inferParts: machine out-of-bounds index returns empty array', () => {
  const nodes: FactoryNode[] = [machineNode('m', 'Iron Ingot')]
  const parts = inferPartsFromUpstream('m', 'out-99', nodes, [])
  assert.deepEqual(parts, [])
})

test('inferParts: machine node with no recipe returns empty array', () => {
  const node: FactoryNode = {
    id: 'm',
    type: 'machineNode',
    position: { x: 0, y: 0 },
    data: { machine: MACHINE, availableRecipes: [], nMachines: 1, clockSpeed: 1.0 } as unknown as FactoryNode['data'],
  }
  const parts = inferPartsFromUpstream('m', 'out-0', [node], [])
  assert.deepEqual(parts, [])
})

test('inferParts: logistics node with no incoming edges returns empty array', () => {
  const nodes: FactoryNode[] = [splitterNode('s')]
  const parts = inferPartsFromUpstream('s', 'out-0', nodes, [])
  assert.deepEqual(parts, [])
})

test('inferParts: splitter passes through upstream part', () => {
  // machineNode → splitter
  const nodes: FactoryNode[] = [machineNode('m', 'Iron Ore'), splitterNode('s')]
  const edges: Edge[] = [edge('e1', 'm', 's', 'out-0', 'in-0')]

  const parts = inferPartsFromUpstream('s', 'out-0', nodes, edges)
  assert.deepEqual(parts, ['Iron Ore'])
})

test('inferParts: merger unions parts from two upstream machines', () => {
  // machineA (Iron Ore) + machineB (Copper Ore) → merger
  const nodes: FactoryNode[] = [
    machineNode('a', 'Iron Ore'),
    machineNode('b', 'Copper Ore'),
    mergerNode('mg'),
  ]
  const edges: Edge[] = [
    edge('e1', 'a', 'mg', 'out-0', 'in-0'),
    edge('e2', 'b', 'mg', 'out-0', 'in-1'),
  ]

  const parts = inferPartsFromUpstream('mg', 'out-0', nodes, edges)
  assert.equal(parts.length, 2)
  assert.ok(parts.includes('Iron Ore'))
  assert.ok(parts.includes('Copper Ore'))
})

test('inferParts: deduplicates same part from multiple upstream paths', () => {
  // Two machines both producing Iron Ore feed into the same merger
  const nodes: FactoryNode[] = [
    machineNode('a', 'Iron Ore'),
    machineNode('b', 'Iron Ore'),
    mergerNode('mg'),
  ]
  const edges: Edge[] = [
    edge('e1', 'a', 'mg', 'out-0', 'in-0'),
    edge('e2', 'b', 'mg', 'out-0', 'in-1'),
  ]

  const parts = inferPartsFromUpstream('mg', 'out-0', nodes, edges)
  assert.deepEqual(parts, ['Iron Ore']) // deduplicated
})

test('inferParts: traverses multiple logistics hops', () => {
  // machine → splitter → merger
  const nodes: FactoryNode[] = [
    machineNode('m', 'Steel'),
    splitterNode('sp'),
    mergerNode('mg'),
  ]
  const edges: Edge[] = [
    edge('e1', 'm', 'sp', 'out-0', 'in-0'),
    edge('e2', 'sp', 'mg', 'out-0', 'in-0'),
  ]

  const parts = inferPartsFromUpstream('mg', 'out-0', nodes, edges)
  assert.deepEqual(parts, ['Steel'])
})

test('inferParts: cycle detection prevents infinite recursion', () => {
  // splitter A → splitter B → splitter A (cycle)
  const nodes: FactoryNode[] = [splitterNode('a'), splitterNode('b')]
  const edges: Edge[] = [
    edge('e1', 'a', 'b', 'out-0', 'in-0'),
    edge('e2', 'b', 'a', 'out-0', 'in-0'),
  ]

  // Should return without throwing and produce an empty result (no machine in cycle)
  let threw = false
  let parts: string[] = []
  try {
    parts = inferPartsFromUpstream('a', 'out-0', nodes, edges)
  } catch {
    threw = true
  }
  assert.equal(threw, false)
  assert.deepEqual(parts, [])
})

test('inferParts: unknown nodeId returns empty array', () => {
  const parts = inferPartsFromUpstream('nonexistent', 'out-0', [], [])
  assert.deepEqual(parts, [])
})

test('inferParts: edges without sourceHandle are skipped for logistics nodes', () => {
  const nodes: FactoryNode[] = [machineNode('m', 'Iron'), splitterNode('s')]
  const badEdge: Edge = { id: 'e1', source: 'm', target: 's', sourceHandle: null, targetHandle: null }

  // The edge has no sourceHandle, so inferPartsFromUpstream skips it
  const parts = inferPartsFromUpstream('s', 'out-0', nodes, [badEdge])
  assert.deepEqual(parts, [])
})

// ─── inferRatesByPartFromUpstream ─────────────────────────────────────────────

test('inferRatesByPartUpstream: machine node returns rate for its output part', () => {
  const nodes: FactoryNode[] = [machineNode('m', 'Iron Ingot')]
  const rateMap = new Map([['m', { inputs: [30], outputs: [30] }]])
  const edgeCount = new Map([['m::out-0', 1]])

  const result = inferRatesByPartFromUpstream('m', 'out-0', nodes, [], rateMap, edgeCount)
  assert.deepEqual(result, { 'Iron Ingot': 30 })
})

test('inferRatesByPartUpstream: splits rate equally among fan-out edges', () => {
  const nodes: FactoryNode[] = [machineNode('m', 'Iron Ingot')]
  const rateMap = new Map([['m', { inputs: [], outputs: [60] }]])
  // Two consumers on the same output handle
  const edgeCount = new Map([['m::out-0', 2]])

  const result = inferRatesByPartFromUpstream('m', 'out-0', nodes, [], rateMap, edgeCount)
  assert.deepEqual(result, { 'Iron Ingot': 30 })
})

test('inferRatesByPartUpstream: logistics node sums upstream contributions', () => {
  const nodes: FactoryNode[] = [
    machineNode('a', 'Iron Ore'),
    machineNode('b', 'Iron Ore'),
    mergerNode('mg'),
  ]
  const edges: Edge[] = [
    edge('e1', 'a', 'mg', 'out-0', 'in-0'),
    edge('e2', 'b', 'mg', 'out-0', 'in-1'),
  ]
  const rateMap = new Map([
    ['a', { inputs: [], outputs: [30] }],
    ['b', { inputs: [], outputs: [30] }],
  ])
  const edgeCount = new Map([['a::out-0', 1], ['b::out-0', 1]])

  const result = inferRatesByPartFromUpstream('mg', 'out-0', nodes, edges, rateMap, edgeCount)
  assert.deepEqual(result, { 'Iron Ore': 60 })
})
