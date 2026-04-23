'use client'

import { useEffect } from 'react'
import type { FactoryNode } from '@/lib/types/store'

type FlowSyncProps = {
  nodes: FactoryNode[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
  incomingRatesByPart: Map<string, Record<string, number>>
  outgoingRatesByPart: Map<string, Record<string, number>>
  setNodeConfig: (nodeId: string, config: { incomingSupply?: number[]; outgoingDemand?: number[]; incomingRatesByPart?: Record<string, number>; outgoingRatesByPart?: Record<string, number> }) => void
}

export function useFlowSync({ nodes, incomingSupply, outgoingDemand, incomingRatesByPart, outgoingRatesByPart, setNodeConfig }: FlowSyncProps) {
  useEffect(() => {
    for (const node of nodes) {
      const incoming = incomingSupply.get(node.id) ?? undefined
      const outgoing = outgoingDemand.get(node.id) ?? undefined
      const inRates = node.type === 'storageNode' ? (incomingRatesByPart.get(node.id) ?? undefined) : undefined
      const outRates = node.type === 'storageNode' ? (outgoingRatesByPart.get(node.id) ?? undefined) : undefined
      const cur = node.data as { incomingSupply?: number[]; outgoingDemand?: number[]; incomingRatesByPart?: Record<string, number>; outgoingRatesByPart?: Record<string, number> }
      const sameIncoming = JSON.stringify(cur.incomingSupply) === JSON.stringify(incoming)
      const sameOutgoing = JSON.stringify(cur.outgoingDemand) === JSON.stringify(outgoing)
      const sameInRates = JSON.stringify(cur.incomingRatesByPart) === JSON.stringify(inRates)
      const sameOutRates = JSON.stringify(cur.outgoingRatesByPart) === JSON.stringify(outRates)
      if (!sameIncoming || !sameOutgoing || !sameInRates || !sameOutRates) {
        setNodeConfig(node.id, { incomingSupply: incoming, outgoingDemand: outgoing, incomingRatesByPart: inRates, outgoingRatesByPart: outRates })
      }
    }
  }, [incomingSupply, outgoingDemand, incomingRatesByPart, outgoingRatesByPart, nodes, setNodeConfig])
}
