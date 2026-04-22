'use client'

import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { MachineNode } from '@/lib/types/store'
import type { MultiMachine } from '@/lib/types/game'
import { calcNodeRates, edgeSufficiencyColor } from '@/lib/flowCalc'
import { fmt } from '@/lib/utils/format'

type EdgeFlowResult = {
  coloredEdges: Edge[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
}

export function useEdgeColors(
  nodes: MachineNode[],
  edges: Edge[],
  multiMachines: MultiMachine[],
): EdgeFlowResult {
  return useMemo(() => {
    const rateMap = new Map<string, { inputs: number[]; outputs: number[] }>()
    for (const node of nodes) {
      rateMap.set(node.id, calcNodeRates(node.data, multiMachines))
    }

    // Count edges per (source, sourceHandle) — supply is split equally among consumers
    const outputEdgeCount = new Map<string, number>()
    for (const edge of edges) {
      if (!edge.sourceHandle) continue
      const key = `${edge.source}::${edge.sourceHandle}`
      outputEdgeCount.set(key, (outputEdgeCount.get(key) ?? 0) + 1)
    }

    const incomingSupply = new Map<string, number[]>()
    const outgoingDemand = new Map<string, number[]>()

    const coloredEdges = edges.map((edge) => {
      if (!edge.sourceHandle || !edge.targetHandle) return { ...edge, animated: true }

      const sourceRates = rateMap.get(edge.source)
      const targetRates = rateMap.get(edge.target)
      const sourceIdx = parseInt(edge.sourceHandle.replace('out-', ''), 10)
      const targetIdx = parseInt(edge.targetHandle.replace('in-', ''), 10)

      const totalSupply = sourceRates?.outputs[sourceIdx] ?? 0
      const fanOut = outputEdgeCount.get(`${edge.source}::${edge.sourceHandle}`) ?? 1
      const supplyThisEdge = totalSupply / fanOut
      const demand = targetRates?.inputs[targetIdx] ?? 0

      const color = edgeSufficiencyColor(supplyThisEdge, demand)

      if (!incomingSupply.has(edge.target)) incomingSupply.set(edge.target, [])
      const tArr = incomingSupply.get(edge.target)!
      tArr[targetIdx] = (tArr[targetIdx] ?? 0) + supplyThisEdge

      if (!outgoingDemand.has(edge.source)) outgoingDemand.set(edge.source, [])
      const sArr = outgoingDemand.get(edge.source)!
      sArr[sourceIdx] = (sArr[sourceIdx] ?? 0) + demand

      const label = supplyThisEdge > 0 ? `${fmt(supplyThisEdge)}/m` : undefined

      return {
        ...edge,
        animated: true,
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fill: color, fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
        label,
      }
    })

    return { coloredEdges, incomingSupply, outgoingDemand }
  }, [edges, nodes, multiMachines])
}
