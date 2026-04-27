import type { FactoryNode } from '../types/store'

export type NodeRect = {
  id: string
  // Center position in flow coordinates (used by collision math).
  cx: number
  cy: number
  w: number
  h: number
  type: FactoryNode['type']
  selected?: boolean
}

// Desired minimum gap between node borders (in px). Applied in collision rects.
const GAP = 4

function ppm(amount: number, batchTime: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(batchTime) || batchTime <= 0) return 0
  return (amount / batchTime) * 60
}

export function estimateNodeSize(node: FactoryNode): { w: number; h: number } {
  // Prefer runtime-measured dimensions when available (React Flow populates these).
  const measured = (node as unknown as { measured?: { width?: number; height?: number } }).measured
  const wMeasured =
    measured?.width ??
    (node as unknown as { width?: number }).width ??
    (typeof node.style?.width === 'number' ? (node.style.width as number) : undefined)
  const hMeasured =
    measured?.height ??
    (node as unknown as { height?: number }).height ??
    (typeof node.style?.height === 'number' ? (node.style.height as number) : undefined)

  if (typeof wMeasured === 'number' && typeof hMeasured === 'number' && wMeasured > 0 && hMeasured > 0) {
    return { w: wMeasured, h: hMeasured }
  }

  switch (node.type) {
    case 'machineNode': {
      const recipe = node.data.recipe
      const inputs = recipe?.inputs?.length ?? 0
      const outputs = recipe?.outputs?.length ?? 0
      const rows = Math.max(inputs, outputs)

      const w = 240 // min-w-[240px]

      // Base layout constants (keep deterministic to avoid jitter)
      const HEADER_H = 36
      const BODY_PT_PB = 16 // py-2
      const RECIPE_ROW = 26 // recipe row + badge (matches comment in MachineNode.tsx)
      const ITEM_H = 32
      const ITEM_GAP = 2
      const BODY_STACK_GAP = 6 // space-y-1.5

      // Conditional blocks (include mt-* since they are only present when rendered)
      const LEFTOVER_BLOCK_H = 28 // mt-1 (4) + content block (~24)
      const UTIL_BAR_H = 38 // mt-1.5 (6) + label+bar (~32)

      const displayMachines = (node.data.autoNMachines ?? node.data.nMachines) || 1
      const clock = node.data.clockSpeed || 1

      // Heuristic: extractors tend to have no inputs; in UI, "Sobra" is disabled for extractors.
      const isExtractorLike = inputs === 0

      let hasLeftover = false
      if (!isExtractorLike && recipe && outputs > 0 && node.data.outgoingDemand) {
        let unusedTotal = 0
        let unusedMachinesEq = 0

        for (let i = 0; i < recipe.outputs.length; i++) {
          const out = recipe.outputs[i]
          if (!out) continue

          const baseProd = ppm(out.amount, recipe.batchTime) * displayMachines * clock
          const prod = (i === 0 && node.data.outputRateOverride !== undefined)
            ? node.data.outputRateOverride
            : baseProd

          const pulled = node.data.outgoingDemand[i] ?? 0
          const unused = Math.max(0, prod - pulled)
          unusedTotal += unused

          const perOneOut = node.data.nMachines > 0 ? baseProd / node.data.nMachines : 0
          if (perOneOut > 0) unusedMachinesEq = Math.max(unusedMachinesEq, unused / perOneOut)
        }

        hasLeftover = unusedTotal > 0.01 && unusedMachinesEq >= 0.01
      }

      let hasUtilBar = false
      if (recipe && inputs > 0 && node.data.incomingSupply) {
        for (let i = 0; i < recipe.inputs.length; i++) {
          const ing = recipe.inputs[i]
          if (!ing) continue
          const demand = ppm(ing.amount, recipe.batchTime) * displayMachines * clock
          const supply = node.data.incomingSupply[i] ?? 0
          if (demand > 0 && supply > 0) {
            hasUtilBar = true
            break
          }
        }
      }

      const listH = rows > 0 ? (rows * ITEM_H + Math.max(0, rows - 1) * ITEM_GAP) : 0
      const extras = (hasLeftover ? LEFTOVER_BLOCK_H : 0) + (hasUtilBar ? UTIL_BAR_H : 0)

      // The body uses `space-y-1.5`, which changes total height based on which blocks render.
      // Children that affect stacking (ignoring the temporary recipe dropdown):
      // - Recipe/top row
      // - Grid
      // - Optional: "Sobra"
      // - Optional: "Utilização"
      const childCount = 2 + (hasLeftover ? 1 : 0) + (hasUtilBar ? 1 : 0)
      const stackGaps = Math.max(0, childCount - 1) * BODY_STACK_GAP

      const h = HEADER_H + BODY_PT_PB + RECIPE_ROW + listH + stackGaps + extras
      return { w, h }
    }
    case 'splitterNode': {
      return { w: 176, h: 36 + 3 * 32 } // w-44; header + 3 rows
    }
    case 'mergerNode': {
      return { w: 176, h: 36 + 3 * 32 }
    }
    case 'storageNode': {
      return { w: 208, h: 160 } // w-52; conservative height even when expanded
    }
    case 'textNode': {
      const w = 160 // min-w-[160px]
      const lines = Math.max(2, (node.data.text ?? '').split('\n').length)
      const h = Math.max(60, 24 + lines * 18)
      return { w, h }
    }
    case 'frameNode': {
      const w = (node.style?.width as number | undefined) ?? 400
      const h = (node.style?.height as number | undefined) ?? 300
      return { w, h }
    }
    default: {
      return { w: 200, h: 120 }
    }
  }
}

export function nodeToRect(node: FactoryNode, opts?: { includeGap?: boolean }): NodeRect {
  const { w, h } = estimateNodeSize(node)
  const includeGap = opts?.includeGap ?? true
  const pad = includeGap ? GAP : 0

  return {
    id: node.id,
    // React Flow Node.position is top-left. Collision math uses centers.
    cx: node.position.x + w / 2,
    cy: node.position.y + h / 2,
    w: w + pad,
    h: h + pad,
    type: node.type,
    selected: node.selected,
  }
}

export function isCollisionRelevant(node: FactoryNode): boolean {
  // Frames are exempt by design (they act as a background layer).
  return node.type !== 'frameNode'
}
