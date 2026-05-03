import test from 'node:test'
import assert from 'node:assert/strict'

import { exportConnectedFlow, exportConnectedFlowCompact } from '../lib/utils/exportFlow'
import type { FactoryNode, MachineNodeData } from '../lib/types/store'
import type { Edge } from '@xyflow/react'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DUMMY_MACHINE = { name: 'Constructor', tier: '0-1', averagePower: 4, maxProductionShards: 0 }
const DUMMY_RECIPE = {
  name: 'Iron Ingot', machine: 'Smelter', batchTime: 2, tier: '0-1', alternate: false,
  inputs: [{ part: 'Iron Ore', amount: 1 }],
  outputs: [{ part: 'Iron Ingot', amount: 1 }],
}

function machineNode(id: string, x = 0, y = 0, extraData: Partial<MachineNodeData> = {}): FactoryNode {
  return {
    id,
    type: 'machineNode',
    position: { x, y },
    data: {
      machine: DUMMY_MACHINE,
      recipe: DUMMY_RECIPE,
      availableRecipes: [DUMMY_RECIPE],
      nMachines: 1,
      clockSpeed: 1.0,
      ...extraData,
    },
  }
}

function splitterNode(id: string, x = 0, y = 0): FactoryNode {
  return { id, type: 'splitterNode', position: { x, y }, data: {} }
}

function edge(id: string, source: string, target: string, sh?: string, th?: string): Edge {
  return { id, source, target, sourceHandle: sh ?? null, targetHandle: th ?? null }
}

// ─── exportConnectedFlow ──────────────────────────────────────────────────────

test('exportConnectedFlow: includes only nodes connected to root', () => {
  const nodes: FactoryNode[] = [
    machineNode('a'),
    machineNode('b'),
    machineNode('isolated'), // not connected
  ]
  const edges: Edge[] = [edge('e1', 'a', 'b')]

  const result = exportConnectedFlow(nodes, edges, 'a')

  const ids = result.nodes.map(n => n.id)
  assert.ok(ids.includes('a'))
  assert.ok(ids.includes('b'))
  assert.equal(ids.includes('isolated'), false)
})

test('exportConnectedFlow: traverses bidirectionally (upstream + downstream)', () => {
  // root is b in the middle: a→b→c
  const nodes: FactoryNode[] = [machineNode('a'), machineNode('b'), machineNode('c')]
  const edges: Edge[] = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]

  const result = exportConnectedFlow(nodes, edges, 'b')

  const ids = new Set(result.nodes.map(n => n.id))
  assert.ok(ids.has('a'))
  assert.ok(ids.has('b'))
  assert.ok(ids.has('c'))
})

test('exportConnectedFlow: only includes edges between selected nodes', () => {
  const nodes: FactoryNode[] = [
    machineNode('a'), machineNode('b'), machineNode('c'),
  ]
  const edges: Edge[] = [
    edge('e1', 'a', 'b'),
    edge('e2', 'b', 'c'),
    edge('e3', 'c', 'a'), // creates a cycle, still valid
  ]

  const result = exportConnectedFlow(nodes, edges, 'a')
  assert.equal(result.edges.length, 3)
})

test('exportConnectedFlow: strips computed fields from machineNode data', () => {
  const nodeWithComputed = machineNode('root', 0, 0, {
    incomingSupply: [30],
    outgoingDemand: [30],
    incomingPotential: [30],
    effectiveRates: { inputs: [30], outputs: [30] },
    efficiency: 0.95,
  })

  const result = exportConnectedFlow([nodeWithComputed], [], 'root')

  const exported = result.nodes[0]!
  assert.equal(exported.type, 'machineNode')
  const data = exported.data as MachineNodeData
  assert.equal(data.incomingSupply, undefined)
  assert.equal(data.outgoingDemand, undefined)
  assert.equal(data.incomingPotential, undefined)
  assert.equal(data.effectiveRates, undefined)
  assert.equal(data.efficiency, undefined)
})

test('exportConnectedFlow: preserves non-computed machineNode fields', () => {
  const node = machineNode('root', 10, 20, { nMachines: 3, clockSpeed: 1.5 })
  const result = exportConnectedFlow([node], [], 'root')

  const data = result.nodes[0]!.data as MachineNodeData
  assert.equal(data.nMachines, 3)
  assert.equal(data.clockSpeed, 1.5)
})

test('exportConnectedFlow: does not strip fields from non-machineNode types', () => {
  const nodes: FactoryNode[] = [splitterNode('s'), machineNode('m')]
  const edges: Edge[] = [edge('e1', 'm', 's')]

  const result = exportConnectedFlow(nodes, edges, 'm')

  const splitter = result.nodes.find(n => n.id === 's')
  assert.ok(splitter)
  assert.equal(splitter.type, 'splitterNode')
})

test('exportConnectedFlow: single isolated root node', () => {
  const result = exportConnectedFlow([machineNode('solo')], [], 'solo')
  assert.equal(result.nodes.length, 1)
  assert.equal(result.edges.length, 0)
  assert.equal(result.rootNodeId, 'solo')
  assert.equal(result.version, 1)
})

test('exportConnectedFlow: rootNodeId not in nodes list produces empty export', () => {
  const result = exportConnectedFlow([machineNode('a')], [], 'missing')
  // 'missing' is visited but not in byId map — filtered out
  assert.equal(result.nodes.length, 0)
  assert.equal(result.rootNodeId, 'missing')
})

// ─── exportConnectedFlowCompact ───────────────────────────────────────────────

test('exportConnectedFlowCompact: version and kind fields correct', () => {
  const result = exportConnectedFlowCompact([machineNode('a')], [], 'a')
  assert.equal(result.version, 1)
  assert.equal(result.kind, 'compact')
})

test('exportConnectedFlowCompact: machineNode produces correct compact shape', () => {
  const node = machineNode('a', 100.6, 200.4, { nMachines: 2, clockSpeed: 1.5 })
  const result = exportConnectedFlowCompact([node], [], 'a')

  const cn = result.nodes[0]
  assert.ok(cn)
  assert.equal(cn.type, 'machineNode')
  if (cn.type === 'machineNode') {
    assert.equal(cn.x, 101) // Math.round(100.6)
    assert.equal(cn.y, 200) // Math.round(200.4)
    assert.equal(cn.machine, 'Constructor')
    assert.equal(cn.recipe, 'Iron Ingot')
    assert.equal(cn.n, 2)
    assert.equal(cn.clock, 1.5)
  }
})

test('exportConnectedFlowCompact: splitter node produces minimal compact shape', () => {
  const nodes: FactoryNode[] = [machineNode('m'), splitterNode('s', 50, 50)]
  const edges: Edge[] = [edge('e1', 'm', 's', 'out-0', 'in-0')]
  const result = exportConnectedFlowCompact(nodes, edges, 'm')

  const cn = result.nodes.find(n => n.id === 's')
  assert.ok(cn)
  assert.equal(cn.type, 'splitterNode')
  assert.equal(cn.x, 50)
  assert.equal(cn.y, 50)
  // machineNode-specific fields should not appear
  assert.equal('machine' in cn, false)
})

test('exportConnectedFlowCompact: edge handles are preserved', () => {
  const nodes: FactoryNode[] = [machineNode('a'), machineNode('b')]
  const edges: Edge[] = [edge('e1', 'a', 'b', 'out-0', 'in-0')]
  const result = exportConnectedFlowCompact(nodes, edges, 'a')

  const ce = result.edges[0]
  assert.ok(ce)
  assert.equal(ce.s, 'a')
  assert.equal(ce.t, 'b')
  assert.equal(ce.sh, 'out-0')
  assert.equal(ce.th, 'in-0')
})

test('exportConnectedFlowCompact: null handles become undefined (not null)', () => {
  const nodes: FactoryNode[] = [machineNode('a'), machineNode('b')]
  const edges: Edge[] = [edge('e1', 'a', 'b')] // null handles
  const result = exportConnectedFlowCompact(nodes, edges, 'a')

  const ce = result.edges[0]
  assert.ok(ce)
  assert.equal(ce.sh, undefined)
  assert.equal(ce.th, undefined)
})
