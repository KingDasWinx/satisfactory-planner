import type { FactoryNode } from '../types/store'
import { isCollisionRelevant, nodeToRect } from './nodeGeometry'

type Point = { x: number; y: number }

function rectsOverlap(
  a: { cx: number; cy: number; w: number; h: number },
  b: { cx: number; cy: number; w: number; h: number }
): boolean {
  return Math.abs(a.cx - b.cx) < (a.w / 2 + b.w / 2) && Math.abs(a.cy - b.cy) < (a.h / 2 + b.h / 2)
}

function mtvPush(
  a: { cx: number; cy: number; w: number; h: number },
  b: { cx: number; cy: number; w: number; h: number }
): Point {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const penX = (a.w / 2 + b.w / 2) - Math.abs(dx)
  const penY = (a.h / 2 + b.h / 2) - Math.abs(dy)

  if (penX <= 0 || penY <= 0) return { x: 0, y: 0 }

  if (penX < penY) {
    return { x: dx >= 0 ? penX : -penX, y: 0 }
  }

  return { x: 0, y: dy >= 0 ? penY : -penY }
}

export function constrainDraggedNodesLive(nodes: FactoryNode[], draggedIds: Set<string>): FactoryNode[] {
  const relevant = nodes.filter(isCollisionRelevant)

  const byId = new Map<string, FactoryNode>()
  for (const n of nodes) {
    byId.set(n.id, { ...n, position: { ...n.position } } as FactoryNode)
  }

  // During drag: do NOT move other nodes. Only clamp dragged nodes so they don't overlap.
  // Keep iterations low to avoid jitter.
  const iterations = 6
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false

    for (const dragged of relevant) {
      if (!draggedIds.has(dragged.id)) continue
      const draggedNode = byId.get(dragged.id)
      if (!draggedNode) continue
      let a = nodeToRect(draggedNode)

      for (const other of relevant) {
        if (other.id === dragged.id) continue
        if (draggedIds.has(other.id)) continue

        const bNode = byId.get(other.id)
        if (!bNode) continue
        const b = nodeToRect(bNode)
        if (!rectsOverlap(a, b)) continue

        // mtvPush(a,b) returns vector to push B away from A.
        // Here we want to move A (dragged) away from B, so we invert.
        const pushB = mtvPush(b, a)
        if (pushB.x === 0 && pushB.y === 0) continue

        draggedNode.position = { x: draggedNode.position.x + pushB.x, y: draggedNode.position.y + pushB.y }
        byId.set(draggedNode.id, draggedNode)
        a = nodeToRect(draggedNode)
        moved = true
      }
    }

    if (!moved) break
  }

  return nodes.map((n) => byId.get(n.id) ?? n)
}

export function settleNodesNoOverlap(
  nodes: FactoryNode[],
  opts?: { iterations?: number; fixedIds?: Set<string> }
): FactoryNode[] {
  const fixedIds = opts?.fixedIds ?? new Set<string>()
  const iterations = opts?.iterations ?? 20

  const relevant = nodes.filter(isCollisionRelevant)

  const byId = new Map<string, FactoryNode>()
  for (const n of nodes) {
    byId.set(n.id, { ...n, position: { ...n.position } } as FactoryNode)
  }

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false

    for (let i = 0; i < relevant.length; i++) {
      const a0 = byId.get(relevant[i]!.id)
      if (!a0) continue
      const a = nodeToRect(a0)

      for (let j = i + 1; j < relevant.length; j++) {
        const b0 = byId.get(relevant[j]!.id)
        if (!b0) continue
        const b = nodeToRect(b0)

        if (!rectsOverlap(a, b)) continue

        const pushB = mtvPush(a, b)
        if (pushB.x === 0 && pushB.y === 0) continue

        const aFixed = fixedIds.has(a0.id)
        const bFixed = fixedIds.has(b0.id)

        if (aFixed && bFixed) continue

        if (aFixed && !bFixed) {
          b0.position = { x: b0.position.x + pushB.x, y: b0.position.y + pushB.y }
          byId.set(b0.id, b0)
          moved = true
          continue
        }

        if (!aFixed && bFixed) {
          a0.position = { x: a0.position.x - pushB.x, y: a0.position.y - pushB.y }
          byId.set(a0.id, a0)
          moved = true
          continue
        }

        a0.position = { x: a0.position.x - pushB.x / 2, y: a0.position.y - pushB.y / 2 }
        b0.position = { x: b0.position.x + pushB.x / 2, y: b0.position.y + pushB.y / 2 }
        byId.set(a0.id, a0)
        byId.set(b0.id, b0)
        moved = true
      }
    }

    if (!moved) break
  }

  return nodes.map((n) => byId.get(n.id) ?? n)
}
