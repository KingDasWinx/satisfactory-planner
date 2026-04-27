import test from 'node:test'
import assert from 'node:assert/strict'

import { getAlignmentSnap, getSpacingGuides } from '../lib/utils/alignmentGuides'

test('alignment: snaps dragged node centerX to target centerX', () => {
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'b', type: 'machineNode', position: { x: 498, y: 0 }, measured: { width: 240, height: 200 }, data: {} },
  ] as any

  const out = getAlignmentSnap({
    draggedId: 'b',
    nodes,
    alignThreshold: 6,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.vertical?.axis, 'x')
  assert.equal(out.vertical?.kind, 'centerX')
  // centerX(a)=120 => top-left(b)=120-240/2 = 0
  assert.equal(out.snapPosition.x, 0)
})

test('alignment: snaps dragged bottom to target bottom', () => {
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 100 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'b', type: 'machineNode', position: { x: 300, y: 223 }, measured: { width: 240, height: 200 }, data: {} },
  ] as any

  const out = getAlignmentSnap({
    draggedId: 'b',
    nodes,
    alignThreshold: 6,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.horizontal?.axis, 'y')
  assert.equal(out.horizontal?.kind, 'bottom')
  // bottom(a)=220 => top-left(b)=220-200 = 20
  assert.equal(out.snapPosition.y, 20)
})

test('spacing: snaps dragged to match existing horizontal gap', () => {
  // A ---gap(40)--- C. Move B to make A->B gap match 40.
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'c', type: 'machineNode', position: { x: 280, y: 0 }, measured: { width: 240, height: 120 }, data: {} }, // gapLR = 40
    { id: 'b', type: 'machineNode', position: { x: 42, y: 0 }, measured: { width: 240, height: 120 }, data: {} }, // close to target 240+40=280? (left.right=240)
  ] as any

  const out = getSpacingGuides({
    draggedId: 'b',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.guides[0]?.axis, 'x')
  assert.equal(out.snapPosition.x, 280) // left.right(240) + gapLR(40)
})

test('spacing: snaps dragged to match existing vertical gap with 3+ nodes', () => {
  // A
  // (gap 60)
  // C
  // Add/move B so that it maintains the same gap in the column.
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'c', type: 'machineNode', position: { x: 0, y: 180 }, measured: { width: 240, height: 120 }, data: {} }, // gap = 60
    { id: 'd', type: 'machineNode', position: { x: 0, y: 360 }, measured: { width: 240, height: 120 }, data: {} }, // another gap = 60
    { id: 'b', type: 'machineNode', position: { x: 0, y: 58 }, measured: { width: 240, height: 120 }, data: {} }, // near target y=180? no, we want after a: y=120+60=180
  ] as any

  const out = getSpacingGuides({
    draggedId: 'b',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.guides[0]?.axis, 'y')
  assert.equal(out.snapPosition.y, 180)
})

test('spacing: 2 nodes in column => snap 3rd after last with same gap', () => {
  // A(top=0,h=120) gap=60 C(top=180,h=120)
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'c', type: 'machineNode', position: { x: 0, y: 180 }, measured: { width: 240, height: 120 }, data: {} },
    // dragged near expected y= (c.bottom + 60) = 300 + 60 = 360
    { id: 'b', type: 'machineNode', position: { x: 0, y: 356 }, measured: { width: 240, height: 120 }, data: {} },
  ] as any

  const out = getSpacingGuides({
    draggedId: 'b',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.guides[0]?.axis, 'y')
  assert.equal(out.snapPosition.y, 360)
})

test('spacing: multiple vertical gaps => picks closest candidate', () => {
  // Two different gaps in the column: gap1=40, gap2=80.
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'b', type: 'machineNode', position: { x: 0, y: 160 }, measured: { width: 240, height: 120 }, data: {} }, // gap1=40
    { id: 'c', type: 'machineNode', position: { x: 0, y: 360 }, measured: { width: 240, height: 120 }, data: {} }, // gap2=80
    // dragged near afterLast using gap2: last.bottom=480 => 480+80=560, use y=556 within threshold 8
    { id: 'd', type: 'machineNode', position: { x: 0, y: 556 }, measured: { width: 240, height: 120 }, data: {} },
  ] as any

  const out = getSpacingGuides({
    draggedId: 'd',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  assert.equal(out.guides[0]?.axis, 'y')
  assert.equal(out.guides[0]?.gap, 80)
  assert.equal(out.snapPosition.y, 560)
})

test('spacing: returns both axis suggestions when applicable', () => {
  const nodes = [
    // column gap=60
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'c', type: 'machineNode', position: { x: 0, y: 180 }, measured: { width: 240, height: 120 }, data: {} },
    // row gap=40
    { id: 'r1', type: 'machineNode', position: { x: 300, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'r2', type: 'machineNode', position: { x: 580, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    // dragged near both recommendations
    { id: 'd', type: 'machineNode', position: { x: 340, y: 356 }, measured: { width: 240, height: 120 }, data: {} },
  ] as any

  const out = getSpacingGuides({
    draggedId: 'd',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  const axes = new Set(out.guides.map((g: any) => g.axis))
  assert.equal(axes.has('x'), true)
  assert.equal(axes.has('y'), true)
})

test('spacing: referenceGuides include all existing consecutive pairs with same gap', () => {
  const nodes = [
    { id: 'a', type: 'machineNode', position: { x: 0, y: 0 }, measured: { width: 240, height: 120 }, data: {} },
    { id: 'c', type: 'machineNode', position: { x: 0, y: 180 }, measured: { width: 240, height: 120 }, data: {} }, // gap=60
    { id: 'd', type: 'machineNode', position: { x: 0, y: 360 }, measured: { width: 240, height: 120 }, data: {} }, // gap=60
    // dragged near afterLast using gap 60 => last.bottom=480 => 540
    { id: 'b', type: 'machineNode', position: { x: 0, y: 536 }, measured: { width: 240, height: 120 }, data: {} },
  ] as any

  const out = getSpacingGuides({
    draggedId: 'b',
    nodes,
    spacingThreshold: 8,
    sameLineOverlapRatio: 0.3,
    excludeTypes: new Set(['frameNode']),
  })

  assert.ok(out)
  const refsY = out.referenceGuides.filter((g: any) => g.axis === 'y')
  assert.equal(refsY.length, 2)
  assert.equal(refsY.every((g: any) => g.gap === 60), true)
})

