import test from 'node:test'
import assert from 'node:assert/strict'

import type { FactoryNode } from '../lib/types/store'
import { constrainDraggedNodesLive, settleNodesNoOverlap } from '../lib/utils/nodeRepulsion'
import { isCollisionRelevant, nodeToRect } from '../lib/utils/nodeGeometry'

function overlapsAny(nodes: FactoryNode[]): boolean {
  const rel = nodes.filter(isCollisionRelevant)
  for (let i = 0; i < rel.length; i++) {
    const a = nodeToRect(rel[i]!)
    for (let j = i + 1; j < rel.length; j++) {
      const b = nodeToRect(rel[j]!)
      const hit = Math.abs(a.x - b.x) < (a.w / 2 + b.w / 2) && Math.abs(a.y - b.y) < (a.h / 2 + b.h / 2)
      if (hit) return true
    }
  }
  return false
}

test('settleNodesNoOverlap removes overlaps deterministically', () => {
  const base: FactoryNode[] = [
    { id: 'a', type: 'splitterNode', position: { x: 0, y: 0 }, data: {} } as FactoryNode,
    { id: 'b', type: 'splitterNode', position: { x: 0, y: 0 }, data: {} } as FactoryNode,
    { id: 'c', type: 'splitterNode', position: { x: 0, y: 0 }, data: {} } as FactoryNode,
  ]

  const out1 = settleNodesNoOverlap(base, { iterations: 50 })
  const out2 = settleNodesNoOverlap(base, { iterations: 50 })

  assert.equal(overlapsAny(out1), false)
  assert.deepEqual(out1.map((n) => n.position), out2.map((n) => n.position))
})

test('constrainDraggedNodesLive keeps non-dragged nodes fixed', () => {
  const nodes: FactoryNode[] = [
    { id: 'drag', type: 'splitterNode', position: { x: 0, y: 0 }, data: {}, selected: true } as FactoryNode,
    { id: 'other', type: 'splitterNode', position: { x: 0, y: 0 }, data: {} } as FactoryNode,
  ]

  const out = constrainDraggedNodesLive(nodes, new Set(['drag']))
  const drag = out.find((n) => n.id === 'drag')!
  const other = out.find((n) => n.id === 'other')!

  assert.deepEqual(other.position, { x: 0, y: 0 })
  assert.equal(overlapsAny(out), false)
})

test('frameNode is exempt (may overlap)', () => {
  const nodes: FactoryNode[] = [
    {
      id: 'frame',
      type: 'frameNode',
      position: { x: 0, y: 0 },
      data: { label: 'Área' },
      style: { width: 400, height: 300 },
      zIndex: -1,
    } as FactoryNode,
    { id: 'other', type: 'splitterNode', position: { x: 0, y: 0 }, data: {} } as FactoryNode,
  ]

  const out = settleNodesNoOverlap(nodes, { iterations: 20 })
  assert.deepEqual(out.find((n) => n.id === 'frame')!.position, { x: 0, y: 0 })
})

