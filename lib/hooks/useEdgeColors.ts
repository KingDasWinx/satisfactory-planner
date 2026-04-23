'use client'

import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { FactoryNode } from '@/lib/types/store'
import type { MultiMachine } from '@/lib/types/game'
import { calcNodeRates, edgeSufficiencyColor, calcSplitterDistribution } from '@/lib/flowCalc'
import { inferRatesByPartFromUpstream } from '@/lib/utils/inferParts'
import { fmt } from '@/lib/utils/format'

type EdgeFlowResult = {
  coloredEdges: Edge[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
  incomingRatesByPart: Map<string, Record<string, number>>
  outgoingRatesByPart: Map<string, Record<string, number>>
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

    // Count edges per (target, targetHandle) — demand is shared among all suppliers of the same handle
    const inputEdgeCount = new Map<string, number>()
    for (const edge of edges) {
      if (!edge.targetHandle) continue
      const key = `${edge.target}::${edge.targetHandle}`
      inputEdgeCount.set(key, (inputEdgeCount.get(key) ?? 0) + 1)
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
            const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
            return acc + (targetRates?.inputs[targetIdx] ?? 0) / fanIn
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
          const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
          return acc + (targetRates?.inputs[targetIdx] ?? 0) / fanIn
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
      } else if (node.type === 'storageNode') {
        // Build a per-part supply map from all incoming edges
        const inputEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'in-0')
        const supplyByPart: Record<string, number> = {}
        let totalSupply = 0
        for (const inputEdge of inputEdges) {
          const ratesByPart = inferRatesByPartFromUpstream(
            inputEdge.source, inputEdge.sourceHandle ?? 'out-0',
            nodes, edges, rateMap, outputEdgeCount,
          )
          for (const [part, rate] of Object.entries(ratesByPart)) {
            supplyByPart[part] = (supplyByPart[part] ?? 0) + rate
            totalSupply += rate
          }
        }

        // For each output edge, find what part the downstream machine needs,
        // then distribute only that part's supply among edges requesting it.
        const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === 'out-0')

        // Group output edges by the part they consume
        const edgesByPart: Record<string, { edgeId: string; demand: number }[]> = {}
        for (const e of outEdges) {
          const targetRates = rateMap.get(e.target)
          const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
          const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
          const demand = (targetRates?.inputs[targetIdx] ?? 0) / fanIn
          // Infer the part this downstream node needs
          const targetNode = nodes.find(n => n.id === e.target)
          let part: string | undefined
          if (targetNode?.type === 'machineNode') {
            part = targetNode.data.recipe?.inputs[targetIdx]?.part
          }
          if (!part) continue
          if (!edgesByPart[part]) edgesByPart[part] = []
          edgesByPart[part].push({ edgeId: e.id, demand })
        }

        // Distribute per-part supply across the edges that need each part
        const outputsByEdge: Record<string, number> = {}
        const actualOutByPart: Record<string, number> = {}   // what actually exits (≤ supply)
        const totalDemandByPart: Record<string, number> = {} // what downstream wants
        for (const [part, consumers] of Object.entries(edgesByPart)) {
          const available = supplyByPart[part] ?? 0
          const demands = consumers.map(c => c.demand > 0 ? c.demand : Infinity)
          const dist = calcSplitterDistribution(available, demands)
          consumers.forEach((c, i) => { outputsByEdge[c.edgeId] = dist[i] ?? 0 })
          actualOutByPart[part] = dist.reduce((s, v) => s + v, 0)
          totalDemandByPart[part] = consumers.reduce((s, c) => s + (isFinite(c.demand) ? c.demand : 0), 0)
        }

        rateMap.set(node.id, {
          inputs: [totalSupply],
          outputs: [Object.values(outputsByEdge).reduce((s, v) => s + v, 0)],
          supplyByPart,
          actualOutByPart,
          totalDemandByPart,
          outputsByEdge,
        } as {
          inputs: number[]; outputs: number[]
          supplyByPart: Record<string, number>
          actualOutByPart: Record<string, number>
          totalDemandByPart: Record<string, number>
          outputsByEdge: Record<string, number>
        })
      }
    }

    const incomingSupply = new Map<string, number[]>()
    const outgoingDemand = new Map<string, number[]>()
    const incomingRatesByPart = new Map<string, Record<string, number>>()
    const outgoingRatesByPart = new Map<string, Record<string, number>>()

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
      } else if (sourceNode?.type === 'storageNode') {
        // Storage pre-computes per-edge allocation keyed by edge.id
        const sr = sourceRates as { outputsByEdge?: Record<string, number> } | undefined
        supplyThisEdge = sr?.outputsByEdge?.[edge.id] ?? 0
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
      } else if (targetNode?.type === 'storageNode') {
        // If this part is in deficit downstream (demand > supply), signal the upstream.
        // Otherwise the input edge is green — storage accepts whatever arrives.
        const sr = targetRates as { supplyByPart?: Record<string, number>; totalDemandByPart?: Record<string, number> } | undefined
        if (sr?.supplyByPart && sr?.totalDemandByPart && edge.sourceHandle) {
          const edgeParts = inferRatesByPartFromUpstream(edge.source, edge.sourceHandle, nodes, edges, rateMap, outputEdgeCount)
          // Find the dominant part on this edge and check if storage is in deficit for it
          let worstRatio = 1
          for (const part of Object.keys(edgeParts)) {
            const partDemand = sr.totalDemandByPart[part] ?? 0
            const partSupply = sr.supplyByPart[part] ?? 0
            if (partDemand > 0 && partSupply < partDemand) {
              const ratio = partSupply / partDemand
              if (ratio < worstRatio) worstRatio = ratio
            }
          }
          demand = worstRatio < 1 ? supplyThisEdge / worstRatio : supplyThisEdge
        } else {
          demand = supplyThisEdge
        }
      } else {
        const totalDemand = targetRates?.inputs[targetIdx] ?? 0
        const fanIn = inputEdgeCount.get(`${edge.target}::${edge.targetHandle}`) ?? 1
        demand = totalDemand / fanIn
      }

      const color = edgeSufficiencyColor(supplyThisEdge, demand)

      if (!incomingSupply.has(edge.target)) incomingSupply.set(edge.target, [])
      const tArr = incomingSupply.get(edge.target)!
      tArr[targetIdx] = (tArr[targetIdx] ?? 0) + supplyThisEdge

      if (!outgoingDemand.has(edge.source)) outgoingDemand.set(edge.source, [])
      const sArr = outgoingDemand.get(edge.source)!
      sArr[sourceIdx] = (sArr[sourceIdx] ?? 0) + demand

      // Populate rates-by-part maps for storage nodes
      if (sourceNode?.type === 'storageNode') {
        const sr = sourceRates as { supplyByPart?: Record<string, number>; actualOutByPart?: Record<string, number> } | undefined
        if (sr?.supplyByPart) incomingRatesByPart.set(edge.source, sr.supplyByPart)
        if (sr?.actualOutByPart) outgoingRatesByPart.set(edge.source, sr.actualOutByPart)
      } else if (targetNode?.type === 'storageNode' && edge.sourceHandle) {
        const ratesByPart = inferRatesByPartFromUpstream(
          edge.source, edge.sourceHandle, nodes, edges, rateMap, outputEdgeCount,
        )
        const existing = incomingRatesByPart.get(edge.target) ?? {}
        for (const [part, rate] of Object.entries(ratesByPart)) {
          existing[part] = (existing[part] ?? 0) + rate
        }
        incomingRatesByPart.set(edge.target, existing)
      }

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

    return { coloredEdges, incomingSupply, outgoingDemand, incomingRatesByPart, outgoingRatesByPart }
  }, [edges, nodes, multiMachines])
}
