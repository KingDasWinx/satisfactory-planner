'use client'

import { useEffect } from 'react'
import type { FactoryNode } from '@/lib/types/store'
import type { NodeRates } from '@/lib/types/flow'

type FlowSyncProps = {
  nodes: FactoryNode[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
  incomingPotential: Map<string, number[]>
  incomingRatesByPart: Map<string, Record<string, number>>
  outgoingRatesByPart: Map<string, Record<string, number>>
  effectiveRates: Map<string, NodeRates>
  efficiencies: Map<string, number>
  autoNMachines: Map<string, number>
  setNodeConfig: (
    nodeId: string,
    config: {
      // Persisted config (used only for magic auto-apply).
      nMachines?: number
      autoLocked?: boolean
      incomingSupply?: number[]
      outgoingDemand?: number[]
      incomingPotential?: number[]
      incomingRatesByPart?: Record<string, number>
      outgoingRatesByPart?: Record<string, number>
      effectiveRates?: NodeRates
      efficiency?: number
      autoNMachines?: number
      magicAutoApplied?: boolean
      __fromAuto?: boolean
      __unlockAuto?: boolean
    },
  ) => void
}

export function useFlowSync({
  nodes,
  incomingSupply,
  outgoingDemand,
  incomingPotential,
  incomingRatesByPart,
  outgoingRatesByPart,
  effectiveRates,
  efficiencies,
  autoNMachines,
  setNodeConfig,
}: FlowSyncProps) {
  useEffect(() => {
    for (const node of nodes) {
      if (node.type === 'machineNode') {
        const d = node.data as {
          nMachines: number
          autoNMachines?: number
          createdByMagic?: boolean
          magicAutoApplied?: boolean
          autoLocked?: boolean
        }
        const auto = autoNMachines.get(node.id) ?? undefined
        const locked = d.autoLocked === true
        const eps = 0.02
        if (!locked && auto !== undefined && Math.abs(auto - d.nMachines) >= eps) {
          setNodeConfig(node.id, { nMachines: auto, __fromAuto: true })
        }
      }

      const incoming = incomingSupply.get(node.id) ?? undefined
      const outgoing = outgoingDemand.get(node.id) ?? undefined
      const potential = incomingPotential.get(node.id) ?? undefined
      const inRates = node.type === 'storageNode' ? (incomingRatesByPart.get(node.id) ?? undefined) : undefined
      const outRates = node.type === 'storageNode' ? (outgoingRatesByPart.get(node.id) ?? undefined) : undefined
      const effRates = node.type === 'machineNode' ? (effectiveRates.get(node.id) ?? undefined) : undefined
      const eff = node.type === 'machineNode' ? (efficiencies.get(node.id) ?? undefined) : undefined
      const autoN = node.type === 'machineNode' ? (autoNMachines.get(node.id) ?? undefined) : undefined

      const cur = node.data as {
        incomingSupply?: number[]
        outgoingDemand?: number[]
        incomingPotential?: number[]
        incomingRatesByPart?: Record<string, number>
        outgoingRatesByPart?: Record<string, number>
        effectiveRates?: NodeRates
        efficiency?: number
        autoNMachines?: number
      }
      const sameIncoming = JSON.stringify(cur.incomingSupply) === JSON.stringify(incoming)
      const sameOutgoing = JSON.stringify(cur.outgoingDemand) === JSON.stringify(outgoing)
      const samePotential = JSON.stringify(cur.incomingPotential) === JSON.stringify(potential)
      const sameInRates = JSON.stringify(cur.incomingRatesByPart) === JSON.stringify(inRates)
      const sameOutRates = JSON.stringify(cur.outgoingRatesByPart) === JSON.stringify(outRates)

      const sameEffRates = JSON.stringify(cur.effectiveRates) === JSON.stringify(effRates)
      const sameEff = cur.efficiency === eff
      const sameAutoN = cur.autoNMachines === autoN

      if (!sameIncoming || !sameOutgoing || !samePotential || !sameInRates || !sameOutRates || !sameEffRates || !sameEff || !sameAutoN) {
        setNodeConfig(node.id, {
          incomingSupply: incoming,
          outgoingDemand: outgoing,
          incomingPotential: potential,
          incomingRatesByPart: inRates,
          outgoingRatesByPart: outRates,
          effectiveRates: effRates,
          efficiency: eff,
          autoNMachines: autoN,
          __fromAuto: true,
        })
      }
    }
  }, [incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, effectiveRates, efficiencies, autoNMachines, nodes, setNodeConfig])
}
