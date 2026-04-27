'use client'

import { useMemo } from 'react'
import type { FactoryNode } from '@/lib/types'
import type { HelperGuideLine, HelperSpacingGuide, HelperLinesState } from '@/lib/types'
import { getAlignmentSnap, getSpacingGuides } from '@/lib/utils/alignmentGuides'

const ALIGN_THRESHOLD = 6
const SPACING_THRESHOLD = 8
const SAME_LINE_OVERLAP_RATIO = 0.3

export function useHelperLines(args: { nodes: FactoryNode[]; draggedIds: string[]; enabled?: boolean }) {
  const enabled = args.enabled ?? true

  return useMemo<HelperLinesState>(() => {
    if (!enabled || args.draggedIds.length === 0) {
      return { draggedIds: [], snapPositionById: {}, guides: [], spacing: [] }
    }

    const excludeTypes = new Set<FactoryNode['type']>(['frameNode'])
    const snapPositionById: Record<string, { x: number; y: number }> = {}
    const guides: HelperGuideLine[] = []
    const spacing: HelperSpacingGuide[] = []

    for (const draggedId of args.draggedIds) {
      const a = getAlignmentSnap({
        draggedId,
        nodes: args.nodes,
        alignThreshold: ALIGN_THRESHOLD,
        excludeTypes,
      })
      if (a) {
        snapPositionById[draggedId] = a.snapPosition
        if (a.vertical) guides.push(a.vertical)
        if (a.horizontal) guides.push(a.horizontal)
      }

      const s = getSpacingGuides({
        draggedId,
        nodes: args.nodes,
        spacingThreshold: SPACING_THRESHOLD,
        sameLineOverlapRatio: SAME_LINE_OVERLAP_RATIO,
        excludeTypes,
      })
      if (s) {
        snapPositionById[draggedId] = snapPositionById[draggedId] ?? s.snapPosition
        spacing.push(...s.guides)
      }
    }

    return { draggedIds: args.draggedIds, snapPositionById, guides, spacing }
  }, [enabled, args.nodes, args.draggedIds])
}

