'use client'

import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { FactoryNode } from '@/lib/types/store'
import type { MultiMachine } from '@/lib/types/game'
import { calcNodeRates, edgeSufficiencyColor, calcSplitterDistribution } from '@/lib/flowCalc'
import { inferRatesByPartFromUpstream } from '@/lib/utils/inferParts'
import { fmt } from '@/lib/utils/format'
import type { NodeRates } from '@/lib/types/flow'

type EdgeFlowResult = {
  coloredEdges: Edge[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
  incomingPotential: Map<string, number[]>
  incomingRatesByPart: Map<string, Record<string, number>>
  outgoingRatesByPart: Map<string, Record<string, number>>
  effectiveRates: Map<string, NodeRates>
  efficiencies: Map<string, number>
  autoNMachines: Map<string, number>
}

type RateMapValue = NodeRates & {
  // Splitter
  inputDemand?: number
  // Storage
  supplyByPart?: Record<string, number>
  actualOutByPart?: Record<string, number>
  totalDemandByPart?: Record<string, number>
  outputsByEdge?: Record<string, number>
}

export function useEdgeColors(
  nodes: FactoryNode[],
  edges: Edge[],
  multiMachines: MultiMachine[],
): EdgeFlowResult {
  return useMemo(() => {
    // Base (theoretical) machine rates. Effective rates are derived from these by efficiency.
    const baseMachineRates = new Map<string, NodeRates>()
    for (const node of nodes) {
      if (node.type === 'machineNode') {
        baseMachineRates.set(node.id, calcNodeRates(node.data, multiMachines))
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

    function buildTopologyRates(rateMap: Map<string, RateMapValue>) {
      for (const node of nodes) {
        if (node.type === 'splitterNode') {
          const inputEdge = edges.find(e => e.target === node.id && e.targetHandle === 'in-0')
          let totalSupply = 0
          if (inputEdge) {
            const sourceRates = rateMap.get(inputEdge.source)
            const sourceIdx = parseInt((inputEdge.sourceHandle ?? '0').replace('out-', ''), 10)
            const fanOut = outputEdgeCount.get(`${inputEdge.source}::${inputEdge.sourceHandle}`) ?? 1
            totalSupply = ((sourceRates?.outputs[sourceIdx] ?? 0) as number) / fanOut
          }

          const connectedIndices: number[] = []
          const connectedDemands: number[] = []
          for (let i = 0; i < 3; i++) {
            const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === `out-${i}`)
            if (outEdges.length === 0) continue
            const totalDemand = outEdges.reduce((acc, e) => {
              const targetRates = rateMap.get(e.target)
              const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
              const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
              return acc + (((targetRates?.inputs[targetIdx] ?? 0) as number) / fanIn)
            }, 0)
            connectedIndices.push(i)
            connectedDemands.push(totalDemand > 0 ? totalDemand : Infinity)
          }

          const connectedDist = calcSplitterDistribution(totalSupply, connectedDemands)
          const outputs: number[] = [0, 0, 0]
          connectedIndices.forEach((idx, pos) => { outputs[idx] = connectedDist[pos] })

          const totalOutputDemand = connectedDemands.reduce((s, d) => s + (isFinite(d) ? d : 0), 0)
          rateMap.set(node.id, {
            inputs: [totalSupply],
            outputs,
            inputDemand: totalOutputDemand > 0 ? totalOutputDemand : undefined,
          })
        } else if (node.type === 'mergerNode') {
          const inputRates: number[] = [0, 0, 0]
          let totalInput = 0
          for (let i = 0; i < 3; i++) {
            const inEdge = edges.find(e => e.target === node.id && e.targetHandle === `in-${i}`)
            if (!inEdge) continue
            const sourceRates = rateMap.get(inEdge.source)
            const sourceIdx = parseInt((inEdge.sourceHandle ?? '0').replace('out-', ''), 10)
            const fanOut = outputEdgeCount.get(`${inEdge.source}::${inEdge.sourceHandle}`) ?? 1
            const supply = (((sourceRates?.outputs[sourceIdx] ?? 0) as number) / fanOut)
            inputRates[i] = supply
            totalInput += supply
          }

          const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === 'out-0')
          const totalDemand = outEdges.reduce((acc, e) => {
            const targetRates = rateMap.get(e.target)
            const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
            const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
            return acc + (((targetRates?.inputs[targetIdx] ?? 0) as number) / fanIn)
          }, 0)

          const output = totalDemand > 0 ? Math.min(totalInput, totalDemand) : totalInput
          rateMap.set(node.id, { inputs: inputRates, outputs: [output] })
        } else if (node.type === 'storageNode') {
          const inputEdges = edges.filter(e => e.target === node.id && e.targetHandle === 'in-0')
          const supplyByPart: Record<string, number> = {}
          let totalSupply = 0
          for (const inputEdge of inputEdges) {
            const ratesByPart = inferRatesByPartFromUpstream(
              inputEdge.source, inputEdge.sourceHandle ?? 'out-0',
              nodes, edges, rateMap as Map<string, { inputs: number[]; outputs: number[] }>, outputEdgeCount,
            )
            for (const [part, rate] of Object.entries(ratesByPart)) {
              supplyByPart[part] = (supplyByPart[part] ?? 0) + rate
              totalSupply += rate
            }
          }

          const outEdges = edges.filter(e => e.source === node.id && e.sourceHandle === 'out-0')
          const edgesByPart: Record<string, { edgeId: string; demand: number }[]> = {}
          for (const e of outEdges) {
            const targetRates = rateMap.get(e.target)
            const targetIdx = parseInt((e.targetHandle ?? '0').replace('in-', ''), 10)
            const fanIn = inputEdgeCount.get(`${e.target}::${e.targetHandle}`) ?? 1
            const demand = (((targetRates?.inputs[targetIdx] ?? 0) as number) / fanIn)
            const targetNode = nodes.find(n => n.id === e.target)
            let part: string | undefined
            if (targetNode?.type === 'machineNode') {
              part = targetNode.data.recipe?.inputs[targetIdx]?.part
            }
            if (!part) continue
            if (!edgesByPart[part]) edgesByPart[part] = []
            edgesByPart[part].push({ edgeId: e.id, demand })
          }

          const outputsByEdge: Record<string, number> = {}
          const actualOutByPart: Record<string, number> = {}
          const totalDemandByPart: Record<string, number> = {}
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
          })
        }
      }
    }

    function calcEdgeFlows(rateMap: Map<string, RateMapValue>) {
      const incomingSupply = new Map<string, number[]>()
      const outgoingDemand = new Map<string, number[]>()
      const incomingPotential = new Map<string, number[]>()
      const incomingRatesByPart = new Map<string, Record<string, number>>()
      const outgoingRatesByPart = new Map<string, Record<string, number>>()

      const edgeFlow = new Map<string, number>()
      const edgeDemand = new Map<string, number>()

      for (const edge of edges) {
        if (!edge.sourceHandle || !edge.targetHandle) continue

        const sourceRates = rateMap.get(edge.source)
        const targetRates = rateMap.get(edge.target)
        const sourceIdx = parseInt(edge.sourceHandle.replace('out-', ''), 10)
        const targetIdx = parseInt(edge.targetHandle.replace('in-', ''), 10)
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)

        let supplyThisEdge: number
        if (sourceNode?.type === 'splitterNode') {
          supplyThisEdge = (sourceRates?.outputs[sourceIdx] ?? 0) as number
        } else if (sourceNode?.type === 'storageNode') {
          supplyThisEdge = (sourceRates?.outputsByEdge?.[edge.id] ?? 0) as number
        } else {
          const totalSupply = (sourceRates?.outputs[sourceIdx] ?? 0) as number
          const fanOut = outputEdgeCount.get(`${edge.source}::${edge.sourceHandle}`) ?? 1
          supplyThisEdge = totalSupply / fanOut
        }

        let demand: number
        if (targetNode?.type === 'splitterNode') {
          const splitterDemand = (targetRates?.inputDemand ?? undefined) as number | undefined
          demand = splitterDemand !== undefined && splitterDemand > 0 ? splitterDemand : supplyThisEdge
        } else if (targetNode?.type === 'mergerNode') {
          demand = supplyThisEdge
        } else if (targetNode?.type === 'storageNode') {
          if (targetRates?.supplyByPart && targetRates?.totalDemandByPart && edge.sourceHandle) {
            const edgeParts = inferRatesByPartFromUpstream(
              edge.source,
              edge.sourceHandle,
              nodes,
              edges,
              rateMap as Map<string, { inputs: number[]; outputs: number[] }>,
              outputEdgeCount,
            )
            let worstRatio = 1
            for (const part of Object.keys(edgeParts)) {
              const partDemand = targetRates.totalDemandByPart[part] ?? 0
              const partSupply = targetRates.supplyByPart[part] ?? 0
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
          const totalDemand = (targetRates?.inputs[targetIdx] ?? 0) as number
          const fanIn = inputEdgeCount.get(`${edge.target}::${edge.targetHandle}`) ?? 1
          demand = totalDemand / fanIn
        }

        const flow = Math.min(supplyThisEdge, demand)
        edgeFlow.set(edge.id, flow)
        edgeDemand.set(edge.id, demand)

        if (!incomingSupply.has(edge.target)) incomingSupply.set(edge.target, [])
        const tArr = incomingSupply.get(edge.target)!
        tArr[targetIdx] = (tArr[targetIdx] ?? 0) + flow

        if (!incomingPotential.has(edge.target)) incomingPotential.set(edge.target, [])
        const pArr = incomingPotential.get(edge.target)!
        pArr[targetIdx] = (pArr[targetIdx] ?? 0) + supplyThisEdge

        if (!outgoingDemand.has(edge.source)) outgoingDemand.set(edge.source, [])
        const sArr = outgoingDemand.get(edge.source)!
        sArr[sourceIdx] = (sArr[sourceIdx] ?? 0) + flow

        if (sourceNode?.type === 'storageNode') {
          if (sourceRates?.supplyByPart) incomingRatesByPart.set(edge.source, sourceRates.supplyByPart)
          if (sourceRates?.actualOutByPart) outgoingRatesByPart.set(edge.source, sourceRates.actualOutByPart)
        } else if (targetNode?.type === 'storageNode' && edge.sourceHandle) {
          const ratesByPart = inferRatesByPartFromUpstream(
            edge.source,
            edge.sourceHandle,
            nodes,
            edges,
            rateMap as Map<string, { inputs: number[]; outputs: number[] }>,
            outputEdgeCount,
          )
          const existing = incomingRatesByPart.get(edge.target) ?? {}
          for (const [part, rate] of Object.entries(ratesByPart)) {
            existing[part] = (existing[part] ?? 0) + rate
          }
          incomingRatesByPart.set(edge.target, existing)
        }
      }

      return { incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, edgeFlow, edgeDemand }
    }

    // Fixed-point iteration: compute machine efficiencies from incoming supply and scale outputs/inputs.
    const efficiencies = new Map<string, number>()
    for (const [id] of baseMachineRates) efficiencies.set(id, 1)

    const MAX_ITERS = 10
    const EPS = 1e-3

    for (let iter = 0; iter < MAX_ITERS; iter++) {
      const rateMap = new Map<string, RateMapValue>()

      for (const [id, base] of baseMachineRates) {
        const eff = efficiencies.get(id) ?? 1
        rateMap.set(id, {
          inputs: base.inputs.map((v) => v * eff),
          outputs: base.outputs.map((v) => v * eff),
        })
      }

      buildTopologyRates(rateMap)
      const flows = calcEdgeFlows(rateMap)

      let maxDelta = 0
      for (const [id, base] of baseMachineRates) {
        const node = nodes.find(n => n.id === id)
        if (node?.type !== 'machineNode') continue

        // Extractors (no inputs) and recipes with no inputs always run at 100%.
        if ((base.inputs?.length ?? 0) === 0) {
          const prev = efficiencies.get(id) ?? 1
          const next = 1
          maxDelta = Math.max(maxDelta, Math.abs(next - prev))
          efficiencies.set(id, next)
          continue
        }

        const supplyArr = flows.incomingSupply.get(id) ?? []
        let eff = 1
        let hasAnyDemand = false
        for (let i = 0; i < base.inputs.length; i++) {
          const demand = base.inputs[i] ?? 0
          if (demand <= 0) continue
          hasAnyDemand = true
          const supply = supplyArr[i] ?? 0
          const ratio = demand > 0 ? supply / demand : 1
          eff = Math.min(eff, ratio)
        }
        const next = hasAnyDemand ? Math.max(0, Math.min(eff, 1)) : 1
        const prev = efficiencies.get(id) ?? 1
        maxDelta = Math.max(maxDelta, Math.abs(next - prev))
        efficiencies.set(id, next)
      }

      if (maxDelta < EPS) break
    }

    // Build final effective rates map (machines + topology) and final flows + colored edges.
    const effectiveRateMap = new Map<string, RateMapValue>()
    const effectiveRates = new Map<string, NodeRates>()
    for (const [id, base] of baseMachineRates) {
      const eff = efficiencies.get(id) ?? 1
      const r: NodeRates = {
        inputs: base.inputs.map(v => v * eff),
        outputs: base.outputs.map(v => v * eff),
      }
      effectiveRates.set(id, r)
      effectiveRateMap.set(id, r)
    }
    buildTopologyRates(effectiveRateMap)
    const { incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, edgeFlow, edgeDemand } =
      calcEdgeFlows(effectiveRateMap)

    // Auto machine count: how many machines would be needed to consume
    // the available upstream supply. Uses incomingPotential (pre-throttle).
    const autoNMachines = new Map<string, number>()
    for (const [id, base] of baseMachineRates) {
      const node = nodes.find(n => n.id === id)
      if (!node || node.type !== 'machineNode') continue
      if ((base.inputs?.length ?? 0) === 0) continue
      const configuredN = node.data.nMachines || 1
      if (configuredN <= 0) continue

      const potentials = incomingPotential.get(id) ?? []
      const perOne = base.inputs.map((v) => v / configuredN)

      let desired = Infinity
      let hasAny = false
      for (let i = 0; i < perOne.length; i++) {
        const per = perOne[i] ?? 0
        if (per <= 0) continue
        hasAny = true
        const available = potentials[i] ?? 0
        desired = Math.min(desired, available / per)
      }
      if (!hasAny || !isFinite(desired)) continue
      // Keep a tiny >0 lower bound to avoid hitting exactly zero and breaking ratios.
      desired = Math.max(0.01, desired)

      // Only set when it differs meaningfully from configured.
      const rounded = Math.round(desired * 100) / 100
      if (Math.abs(rounded - configuredN) >= 0.01) autoNMachines.set(id, rounded)
    }

    const coloredEdges = edges.map((edge) => {
      if (!edge.sourceHandle || !edge.targetHandle) return { ...edge, animated: true }
      const flow = edgeFlow.get(edge.id) ?? 0
      const demand = edgeDemand.get(edge.id) ?? 0
      const color = edgeSufficiencyColor(flow, demand)
      const label = flow > 0 ? `${fmt(flow)}/m` : undefined
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

    return { coloredEdges, incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, effectiveRates, efficiencies, autoNMachines }
  }, [edges, nodes, multiMachines])
}
