import type { Edge } from '@xyflow/react'
import type { FactoryNode, MachineNodeData } from '@/lib/types/store'

const MACHINE_COMPUTED_KEYS = new Set([
  'incomingSupply',
  'outgoingDemand',
  'incomingPotential',
  'effectiveRates',
  'efficiency',
] as const)

function stripComputedFromNode(node: FactoryNode): FactoryNode {
  if (node.type !== 'machineNode') return node
  const data = { ...(node.data as MachineNodeData) } as Record<string, unknown>
  for (const k of MACHINE_COMPUTED_KEYS) delete data[k]
  return { ...node, data: data as unknown as MachineNodeData } as FactoryNode
}

export type ExportedFlow = {
  version: 1
  rootNodeId: string
  nodes: FactoryNode[]
  edges: Edge[]
}

export function exportConnectedFlow(nodes: FactoryNode[], edges: Edge[], rootNodeId: string): ExportedFlow {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const adjacency = new Map<string, Set<string>>()

  function link(a: string, b: string) {
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    adjacency.get(a)!.add(b)
  }

  for (const e of edges) {
    link(e.source, e.target)
    link(e.target, e.source)
  }

  const visited = new Set<string>()
  const queue: string[] = [rootNodeId]
  visited.add(rootNodeId)

  while (queue.length) {
    const cur = queue.shift()!
    const neigh = adjacency.get(cur)
    if (!neigh) continue
    for (const nxt of neigh) {
      if (visited.has(nxt)) continue
      visited.add(nxt)
      queue.push(nxt)
    }
  }

  const selectedNodes = [...visited]
    .map((id) => byId.get(id))
    .filter((n): n is FactoryNode => !!n)
    .map(stripComputedFromNode)

  const selectedIds = new Set(selectedNodes.map((n) => n.id))
  const selectedEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))

  return {
    version: 1,
    rootNodeId,
    nodes: selectedNodes,
    edges: selectedEdges,
  }
}

type CompactNode =
  | { id: string; type: 'machineNode'; x: number; y: number; machine: string; recipe: string; n: number; clock: number; outputOverride?: number }
  | { id: string; type: 'splitterNode' | 'mergerNode' | 'storageNode' | 'textNode' | 'frameNode'; x: number; y: number }

export type ExportedFlowCompact = {
  version: 1
  kind: 'compact'
  rootNodeId: string
  nodes: CompactNode[]
  edges: { s: string; sh?: string; t: string; th?: string }[]
}

export function exportConnectedFlowCompact(nodes: FactoryNode[], edges: Edge[], rootNodeId: string): ExportedFlowCompact {
  const full = exportConnectedFlow(nodes, edges, rootNodeId)
  const compactNodes: CompactNode[] = full.nodes.map((n) => {
    const x = Math.round(n.position.x)
    const y = Math.round(n.position.y)
    if (n.type === 'machineNode') {
      return {
        id: n.id,
        type: 'machineNode',
        x,
        y,
        machine: n.data.machine.name,
        recipe: n.data.recipe?.name ?? '(sem receita)',
        n: n.data.nMachines,
        clock: n.data.clockSpeed,
        outputOverride: n.data.outputRateOverride,
      }
    }
    return { id: n.id, type: n.type, x, y }
  })

  const compactEdges = full.edges.map((e) => ({
    s: e.source,
    sh: e.sourceHandle ?? undefined,
    t: e.target,
    th: e.targetHandle ?? undefined,
  }))

  return { version: 1, kind: 'compact', rootNodeId: full.rootNodeId, nodes: compactNodes, edges: compactEdges }
}

