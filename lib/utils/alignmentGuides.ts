import type { FactoryNode } from '../types/store'
import type { HelperGuideLine, HelperSpacingGuide } from '../types/helperLines'

type Bounds = {
  id: string
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
}

function getNodeSize(node: FactoryNode): { width: number; height: number } {
  const measured = (node as unknown as { measured?: { width?: number; height?: number } }).measured
  const width =
    measured?.width ??
    (node as unknown as { width?: number }).width ??
    (typeof node.style?.width === 'number' ? (node.style.width as number) : undefined) ??
    240
  const height =
    measured?.height ??
    (node as unknown as { height?: number }).height ??
    (typeof node.style?.height === 'number' ? (node.style.height as number) : undefined) ??
    120

  return { width, height }
}

export function getNodeBounds(node: FactoryNode): Bounds {
  const { width, height } = getNodeSize(node)
  const left = node.position.x
  const top = node.position.y
  return {
    id: node.id,
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    width,
    height,
  }
}

function abs(n: number) {
  return n < 0 ? -n : n
}

function bestCandidate<T extends { delta: number }>(cands: T[]): T | null {
  if (cands.length === 0) return null
  let best = cands[0]!
  for (let i = 1; i < cands.length; i++) {
    if (cands[i]!.delta < best.delta) best = cands[i]!
  }
  return best
}

export function getAlignmentSnap(args: {
  draggedId: string
  nodes: FactoryNode[]
  alignThreshold: number
  excludeTypes?: Set<FactoryNode['type']>
}): { snapPosition: { x: number; y: number }; vertical?: HelperGuideLine; horizontal?: HelperGuideLine } | null {
  const excludeTypes = args.excludeTypes ?? new Set()
  const dragged = args.nodes.find((n) => n.id === args.draggedId)
  if (!dragged) return null
  if (excludeTypes.has(dragged.type)) return null

  const db = getNodeBounds(dragged)

  const vertical: Array<{ delta: number; guide: HelperGuideLine; snapX: number }> = []
  const horizontal: Array<{ delta: number; guide: HelperGuideLine; snapY: number }> = []

  for (const n of args.nodes) {
    if (n.id === dragged.id) continue
    if (excludeTypes.has(n.type)) continue
    const b = getNodeBounds(n)

    // vertical lines (x axis) -> snap dragged.x
    const vx = [
      { kind: 'left' as const, target: b.left, mine: db.left, snapX: b.left },
      { kind: 'centerX' as const, target: b.centerX, mine: db.centerX, snapX: b.centerX - db.width / 2 },
      { kind: 'right' as const, target: b.right, mine: db.right, snapX: b.right - db.width },
    ]
    for (const v of vx) {
      const d = abs(v.target - v.mine)
      if (d <= args.alignThreshold) {
        vertical.push({
          delta: d,
          guide: { axis: 'x', kind: v.kind, position: v.target, targetId: n.id },
          snapX: v.snapX,
        })
      }
    }

    // horizontal lines (y axis) -> snap dragged.y
    const hy = [
      { kind: 'top' as const, target: b.top, mine: db.top, snapY: b.top },
      { kind: 'centerY' as const, target: b.centerY, mine: db.centerY, snapY: b.centerY - db.height / 2 },
      { kind: 'bottom' as const, target: b.bottom, mine: db.bottom, snapY: b.bottom - db.height },
    ]
    for (const h of hy) {
      const d = abs(h.target - h.mine)
      if (d <= args.alignThreshold) {
        horizontal.push({
          delta: d,
          guide: { axis: 'y', kind: h.kind, position: h.target, targetId: n.id },
          snapY: h.snapY,
        })
      }
    }
  }

  const bestV = bestCandidate(vertical)
  const bestH = bestCandidate(horizontal)
  if (!bestV && !bestH) return null

  return {
    snapPosition: {
      x: bestV ? bestV.snapX : dragged.position.x,
      y: bestH ? bestH.snapY : dragged.position.y,
    },
    vertical: bestV?.guide,
    horizontal: bestH?.guide,
  }
}

function overlapRatio1D(a0: number, a1: number, b0: number, b1: number): number {
  const left = Math.max(a0, b0)
  const right = Math.min(a1, b1)
  const overlap = right - left
  if (overlap <= 0) return 0
  const minLen = Math.min(a1 - a0, b1 - b0)
  if (minLen <= 0) return 0
  return overlap / minLen
}

export function getSpacingGuides(args: {
  draggedId: string
  nodes: FactoryNode[]
  spacingThreshold: number
  sameLineOverlapRatio: number
  excludeTypes?: Set<FactoryNode['type']>
}): { snapPosition: { x: number; y: number }; guides: HelperSpacingGuide[]; referenceGuides: HelperSpacingGuide[] } | null {
  const excludeTypes = args.excludeTypes ?? new Set()
  const dragged = args.nodes.find((n) => n.id === args.draggedId)
  if (!dragged) return null
  if (excludeTypes.has(dragged.type)) return null

  const db = getNodeBounds(dragged)

  // Candidates: equal horizontal gap (axis x) and equal vertical gap (axis y)
  const snapCands: Array<{ delta: number; snap: { x: number; y: number }; guide: HelperSpacingGuide }> = []
  const referenceGuides: HelperSpacingGuide[] = []

  const others = args.nodes
    .filter((n) => n.id !== dragged.id && !excludeTypes.has(n.type))
    .map(getNodeBounds)

  // Horizontal spacing (same row-ish): use consecutive neighbors (sorted by left).
  const rowCandidates = others.filter((b) => overlapRatio1D(db.top, db.bottom, b.top, b.bottom) >= args.sameLineOverlapRatio)
  rowCandidates.sort((a, b) => a.left - b.left)
  for (let i = 0; i < rowCandidates.length - 1; i++) {
    const left = rowCandidates[i]!
    const right = rowCandidates[i + 1]!
    const gap = right.left - left.right
    if (gap <= 0) continue

    // Snap dragged right after 'left' keeping the same gap.
    const targetX = left.right + gap
    const delta = abs(db.left - targetX)
    if (delta <= args.spacingThreshold) {
      snapCands.push({
        delta,
        snap: { x: targetX, y: dragged.position.y },
        guide: { axis: 'x', x0: left.right, x1: targetX, y: (left.centerY + right.centerY) / 2, gap: Math.round(gap) },
      })
    }

    // Snap dragged right before 'right' keeping the same gap.
    const targetX2 = right.left - gap - db.width
    const delta2 = abs(db.left - targetX2)
    if (delta2 <= args.spacingThreshold) {
      snapCands.push({
        delta: delta2,
        snap: { x: targetX2, y: dragged.position.y },
        guide: { axis: 'x', x0: targetX2 + db.width, x1: right.left, y: (left.centerY + right.centerY) / 2, gap: Math.round(gap) },
      })
    }
  }

  // Vertical spacing (same column-ish): use consecutive neighbors (sorted by top).
  const colCandidates = others.filter((b) => overlapRatio1D(db.left, db.right, b.left, b.right) >= args.sameLineOverlapRatio)
  colCandidates.sort((a, b) => a.top - b.top)
  for (let i = 0; i < colCandidates.length - 1; i++) {
    const top = colCandidates[i]!
    const bottom = colCandidates[i + 1]!
    const gap = bottom.top - top.bottom
    if (gap <= 0) continue

    const targetY = top.bottom + gap
    const delta = abs(db.top - targetY)
    if (delta <= args.spacingThreshold) {
      snapCands.push({
        delta,
        snap: { x: dragged.position.x, y: targetY },
        guide: { axis: 'y', y0: top.bottom, y1: targetY, x: (top.centerX + bottom.centerX) / 2, gap: Math.round(gap) },
      })
    }

    const targetY2 = bottom.top - gap - db.height
    const delta2 = abs(db.top - targetY2)
    if (delta2 <= args.spacingThreshold) {
      snapCands.push({
        delta: delta2,
        snap: { x: dragged.position.x, y: targetY2 },
        guide: { axis: 'y', y0: targetY2 + db.height, y1: bottom.top, x: (top.centerX + bottom.centerX) / 2, gap: Math.round(gap) },
      })
    }
  }

  // Projection candidates: extend existing rhythm before first / after last (common when adding the 3rd node).
  if (colCandidates.length >= 2) {
    for (let i = 0; i < colCandidates.length - 1; i++) {
      const a = colCandidates[i]!
      const b = colCandidates[i + 1]!
      const gap = b.top - a.bottom
      if (gap <= 0) continue

      const first = colCandidates[0]!
      const last = colCandidates[colCandidates.length - 1]!

      const afterLastY = last.bottom + gap
      const deltaAfter = abs(db.top - afterLastY)
      if (deltaAfter <= args.spacingThreshold) {
        snapCands.push({
          delta: deltaAfter,
          snap: { x: dragged.position.x, y: afterLastY },
          guide: { axis: 'y', y0: last.bottom, y1: afterLastY, x: last.centerX, gap: Math.round(gap) },
        })
      }

      const beforeFirstY = first.top - gap - db.height
      const deltaBefore = abs(db.top - beforeFirstY)
      if (deltaBefore <= args.spacingThreshold) {
        snapCands.push({
          delta: deltaBefore,
          snap: { x: dragged.position.x, y: beforeFirstY },
          guide: { axis: 'y', y0: beforeFirstY + db.height, y1: first.top, x: first.centerX, gap: Math.round(gap) },
        })
      }
    }
  }

  if (rowCandidates.length >= 2) {
    for (let i = 0; i < rowCandidates.length - 1; i++) {
      const a = rowCandidates[i]!
      const b = rowCandidates[i + 1]!
      const gap = b.left - a.right
      if (gap <= 0) continue

      const first = rowCandidates[0]!
      const last = rowCandidates[rowCandidates.length - 1]!

      const afterLastX = last.right + gap
      const deltaAfter = abs(db.left - afterLastX)
      if (deltaAfter <= args.spacingThreshold) {
        snapCands.push({
          delta: deltaAfter,
          snap: { x: afterLastX, y: dragged.position.y },
          guide: { axis: 'x', x0: last.right, x1: afterLastX, y: last.centerY, gap: Math.round(gap) },
        })
      }

      const beforeFirstX = first.left - gap - db.width
      const deltaBefore = abs(db.left - beforeFirstX)
      if (deltaBefore <= args.spacingThreshold) {
        snapCands.push({
          delta: deltaBefore,
          snap: { x: beforeFirstX, y: dragged.position.y },
          guide: { axis: 'x', x0: beforeFirstX + db.width, x1: first.left, y: first.centerY, gap: Math.round(gap) },
        })
      }
    }
  }

  // Reference guides (existing nodes): show all consecutive pairs matching the recommended gap.
  // We compute them after bestX/bestY are known (below).

  const bestX = bestCandidate(snapCands.filter((c) => c.guide.axis === 'x'))
  const bestY = bestCandidate(snapCands.filter((c) => c.guide.axis === 'y'))
  if (!bestX && !bestY) return null

  const snapPosition = {
    x: bestX ? bestX.snap.x : dragged.position.x,
    y: bestY ? bestY.snap.y : dragged.position.y,
  }

  const guides: HelperSpacingGuide[] = []
  if (bestX) guides.push(bestX.guide)
  if (bestY) guides.push(bestY.guide)

  const GAP_MATCH_EPS = 1
  if (bestX) {
    const gx = bestX.guide.gap
    for (let i = 0; i < rowCandidates.length - 1; i++) {
      const left = rowCandidates[i]!
      const right = rowCandidates[i + 1]!
      const gap = right.left - left.right
      if (gap <= 0) continue
      if (Math.abs(gap - gx) > GAP_MATCH_EPS) continue
      referenceGuides.push({ axis: 'x', x0: left.right, x1: right.left, y: (left.centerY + right.centerY) / 2, gap: Math.round(gap) })
    }
  }
  if (bestY) {
    const gy = bestY.guide.gap
    for (let i = 0; i < colCandidates.length - 1; i++) {
      const top = colCandidates[i]!
      const bottom = colCandidates[i + 1]!
      const gap = bottom.top - top.bottom
      if (gap <= 0) continue
      if (Math.abs(gap - gy) > GAP_MATCH_EPS) continue
      referenceGuides.push({ axis: 'y', y0: top.bottom, y1: bottom.top, x: (top.centerX + bottom.centerX) / 2, gap: Math.round(gap) })
    }
  }

  return { snapPosition, guides, referenceGuides }
}

