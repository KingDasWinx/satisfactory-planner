import type { Edge } from '@xyflow/react'
import type { FactoryNode } from '@/lib/types/store'

// Collects all unique parts flowing out of a given source handle, recursing through logistics nodes.
// Uses a visited set (nodeId::handle) to prevent infinite loops in cyclic graphs.
export function inferPartsFromUpstream(
  nodeId: string,
  sourceHandle: string,
  nodes: FactoryNode[],
  edges: Edge[],
  visited = new Set<string>(),
): string[] {
  const key = `${nodeId}::${sourceHandle}`
  if (visited.has(key)) return []
  visited.add(key)

  const node = nodes.find(n => n.id === nodeId)
  if (!node) return []

  if (node.type === 'machineNode') {
    const idx = parseInt(sourceHandle.replace('out-', ''), 10)
    const part = node.data.recipe?.outputs[idx]?.part
    return part ? [part] : []
  }

  // For logistics nodes walk ALL incoming edges and union the parts
  const inEdges = edges.filter(e => e.target === nodeId)
  const parts = new Set<string>()
  for (const edge of inEdges) {
    if (!edge.source || !edge.sourceHandle) continue
    for (const p of inferPartsFromUpstream(edge.source, edge.sourceHandle, nodes, edges, visited)) {
      parts.add(p)
    }
  }
  return [...parts]
}

// Returns a map of { part → rate } for all materials flowing into a logistics node's input edge.
// Used by StorageNode to show per-material breakdown.
export function inferRatesByPartFromUpstream(
  nodeId: string,
  sourceHandle: string,
  nodes: FactoryNode[],
  edges: Edge[],
  rateMap: Map<string, { inputs: number[]; outputs: number[] }>,
  outputEdgeCount: Map<string, number>,
  visited = new Set<string>(),
): Record<string, number> {
  const key = `${nodeId}::${sourceHandle}`
  if (visited.has(key)) return {}
  visited.add(key)

  const node = nodes.find(n => n.id === nodeId)
  if (!node) return {}

  if (node.type === 'machineNode') {
    const idx = parseInt(sourceHandle.replace('out-', ''), 10)
    const part = node.data.recipe?.outputs[idx]?.part
    if (!part) return {}
    const rates = rateMap.get(nodeId)
    const total = rates?.outputs[idx] ?? 0
    const fanOut = outputEdgeCount.get(`${nodeId}::${sourceHandle}`) ?? 1
    return { [part]: total / fanOut }
  }

  // For logistics nodes sum contributions from all incoming edges
  const result: Record<string, number> = {}
  const inEdges = edges.filter(e => e.target === nodeId)
  for (const edge of inEdges) {
    if (!edge.source || !edge.sourceHandle) continue
    const upstream = inferRatesByPartFromUpstream(edge.source, edge.sourceHandle, nodes, edges, rateMap, outputEdgeCount, visited)
    for (const [part, rate] of Object.entries(upstream)) {
      result[part] = (result[part] ?? 0) + rate
    }
  }
  return result
}
