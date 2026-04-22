'use client'

import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { FactoryNode } from '@/lib/types/store'
import type { MultiMachine } from '@/lib/types/game'
import { calcNodeRates, edgeSufficiencyColor, calcSplitterDistribution } from '@/lib/flowCalc'
import { fmt } from '@/lib/utils/format'

type EdgeFlowResult = {
  coloredEdges: Edge[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
}

export function useEdgeColors(
  nodes: FactoryNode[],
  edges: Edge[],
  multiMachines: MultiMachine[],
): EdgeFlowResult {
  return useMemo(() => {
    // Pass 1: compute rates for machineNodes
    const rateMap = new Map<string, { inputs: number[]; outputs: number[] }>()
    for (const node of nodes) {
      if (node.type === 'machineNode') {
        rateMap.set(node.id, calcNodeRates(node.data, multiMachines))
      }
    }

    // Count edges per (source, sourceHandle) — supply is split equally among consumers for machineNodes
    const outputEdgeCount = new Map<string, number>()
    for (const edge of edges) {
      if (!edge.sourceHandle) continue
      const key = `${edge.source}::${edge.sourceHandle}`
      outputEdgeCount.set(key, (outputEdgeCount.get(key) ?? 0) + 1)
    }

    // Pass 2: compute rates for splitter/merger nodes (depend on graph topology)
    for (const node of nodes) {
      if (node.type === 'splitterNode') {
        const inputEdge = edges.find(e => e.target === node.id && e.targetHandle === 'in-0')
        let totalSupply = 0
        if (inputEdge) {
          const sourceRates = rateMap.get(inputEdge.source)
          const sourceIdx = parseInt((inputEdge.sourceHandle ?? '0').replace('out-', ''), 10)
          const fanOut = outputEdgeCount.get(`${inputEdge.source}::${inputEdge.sourceHandle}`) ?? 1
          totalSupply = (sourceRates?.outputs[sourceIdx] ?? 0) / fanOut
        }

        // Only include connected outputs in the distribution calculation
        const connectedIndices: number[] = []
        const connectedDemands: number[] = []
        for (let i = 0; i < 3; i++) {
          const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === `out-${i}`)
          if (outEdges.length === 0) continue
          const totalDemand = outEdges.reduce((acc, e) => {
            const targetRates = rateMap.get(e.target)
            const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
            return acc + (targetRates?.inputs[targetIdx] ?? 0)
          }, 0)
          connectedIndices.push(i)
          connectedDemands.push(totalDemand > 0 ? totalDemand : Infinity)
        }

        const connectedDist = calcSplitterDistribution(totalSupply, connectedDemands)
        const outputs: number[] = [0, 0, 0]
        connectedIndices.forEach((idx, pos) => { outputs[idx] = connectedDist[pos] })

        // totalDemand is the sum of all connected output demands — used to signal
        // the upstream machine that the splitter needs more than it's receiving.
        const totalOutputDemand = connectedDemands.reduce((s, d) => s + (isFinite(d) ? d : 0), 0)

        rateMap.set(node.id, {
          inputs: [totalSupply],
          outputs,
          // carry demand so the upstream edge can compare supply vs real need
          inputDemand: totalOutputDemand > 0 ? totalOutputDemand : undefined,
        } as { inputs: number[]; outputs: number[]; inputDemand?: number })
      } else if (node.type === 'mergerNode') {
        let totalInput = 0
        for (let i = 0; i < 3; i++) {
          const inEdge = edges.find(e => e.target === node.id && e.targetHandle === `in-${i}`)
          if (!inEdge) continue
          const sourceRates = rateMap.get(inEdge.source)
          const sourceIdx = parseInt((inEdge.sourceHandle ?? '0').replace('out-', ''), 10)
          const fanOut = outputEdgeCount.get(`${inEdge.source}::${inEdge.sourceHandle}`) ?? 1
          totalInput += (sourceRates?.outputs[sourceIdx] ?? 0) / fanOut
        }

        // Check downstream demand
        const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === 'out-0')
        const totalDemand = outEdges.reduce((acc, e) => {
          const targetRates = rateMap.get(e.target)
          const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
          return acc + (targetRates?.inputs[targetIdx] ?? 0)
        }, 0)

        rateMap.set(node.id, {
          inputs: [0, 0, 0],
          outputs: [Math.min(totalInput, totalDemand > 0 ? totalDemand : totalInput)],
        })

        // Also update per-input slots for display
        const inputRates: number[] = []
        for (let i = 0; i < 3; i++) {
          const inEdge = edges.find(e => e.target === node.id && e.targetHandle === `in-${i}`)
          if (!inEdge) { inputRates.push(0); continue }
          const sourceRates = rateMap.get(inEdge.source)
          const sourceIdx = parseInt((inEdge.sourceHandle ?? '0').replace('out-', ''), 10)
          const fanOut = outputEdgeCount.get(`${inEdge.source}::${inEdge.sourceHandle}`) ?? 1
          inputRates.push((sourceRates?.outputs[sourceIdx] ?? 0) / fanOut)
        }
        rateMap.set(node.id, { inputs: inputRates, outputs: [totalInput] })
      }
    }

    const incomingSupply = new Map<string, number[]>()
    const outgoingDemand = new Map<string, number[]>()

    const coloredEdges = edges.map((edge) => {
      if (!edge.sourceHandle || !edge.targetHandle) return { ...edge, animated: true }

      const sourceRates = rateMap.get(edge.source)
      const targetRates = rateMap.get(edge.target)
      const sourceIdx = parseInt(edge.sourceHandle.replace('out-', ''), 10)
      const targetIdx = parseInt(edge.targetHandle.replace('in-', ''), 10)

      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)

      let supplyThisEdge: number
      if (sourceNode?.type === 'splitterNode') {
        // Splitter outputs are already per-handle (no fan-out division)
        supplyThisEdge = sourceRates?.outputs[sourceIdx] ?? 0
      } else {
        const totalSupply = sourceRates?.outputs[sourceIdx] ?? 0
        const fanOut = outputEdgeCount.get(`${edge.source}::${edge.sourceHandle}`) ?? 1
        supplyThisEdge = totalSupply / fanOut
      }

      let demand: number
      if (targetNode?.type === 'splitterNode') {
        // Use the real downstream demand the splitter computed (sum of all output demands).
        // Falls back to supply so the edge is green when nothing is connected downstream.
        const splitterDemand = (targetRates as { inputDemand?: number } | undefined)?.inputDemand
        demand = splitterDemand !== undefined && splitterDemand > 0 ? splitterDemand : supplyThisEdge
      } else if (targetNode?.type === 'mergerNode') {
        demand = supplyThisEdge
      } else {
        demand = targetRates?.inputs[targetIdx] ?? 0
      }

      const color = edgeSufficiencyColor(supplyThisEdge, demand)

      if (!incomingSupply.has(edge.target)) incomingSupply.set(edge.target, [])
      const tArr = incomingSupply.get(edge.target)!
      tArr[targetIdx] = (tArr[targetIdx] ?? 0) + supplyThisEdge

      if (!outgoingDemand.has(edge.source)) outgoingDemand.set(edge.source, [])
      const sArr = outgoingDemand.get(edge.source)!
      sArr[sourceIdx] = (sArr[sourceIdx] ?? 0) + demand

      const label = supplyThisEdge > 0 ? `${fmt(supplyThisEdge)}/m` : undefined
      const strokeWidth = edge.selected ? 4 : 2

      return {
        ...edge,
        animated: true,
        style: { stroke: color, strokeWidth, filter: edge.selected ? `drop-shadow(0 0 4px ${color})` : undefined },
        labelStyle: { fill: color, fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
        label,
      }
    })

    return { coloredEdges, incomingSupply, outgoingDemand }
  }, [edges, nodes, multiMachines])
}
