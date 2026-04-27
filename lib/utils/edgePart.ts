import type { Edge } from '@xyflow/react'
import type { FactoryNode } from '@/lib/types/store'
import { inferPartsFromUpstream } from '@/lib/utils/inferParts'

type EdgeLike = Edge & { sourceHandleId?: string | null; targetHandleId?: string | null }

export function getEdgePartName(edge: EdgeLike, nodes: FactoryNode[], edges: Edge[]): string | null {
  const sourceHandle = edge.sourceHandle ?? edge.sourceHandleId ?? null
  if (!sourceHandle?.startsWith('out-')) return null
  const idx = parseInt(sourceHandle.replace('out-', ''), 10)
  if (!Number.isFinite(idx)) return null

  const source = nodes.find((n) => n.id === edge.source)
  if (!source) return null

  if (source.type === 'machineNode') {
    return source.data.recipe?.outputs?.[idx]?.part ?? null
  }

  // For logistics nodes, infer upstream parts. Only show icon if the result is unambiguous.
  const parts = inferPartsFromUpstream(edge.source, sourceHandle, nodes, edges)
  if (parts.length === 1) return parts[0] ?? null

  // BETA: multi-part edges intentionally don't show an icon.
  // This is temporary and was forced on purpose.
  return null
}

