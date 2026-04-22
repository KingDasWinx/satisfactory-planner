'use client'

import { useEffect } from 'react'
import type { FactoryNode } from '@/lib/types/store'

type FlowSyncProps = {
  nodes: FactoryNode[]
  incomingSupply: Map<string, number[]>
  outgoingDemand: Map<string, number[]>
  setNodeConfig: (nodeId: string, config: { incomingSupply?: number[]; outgoingDemand?: number[] }) => void
}

export function useFlowSync({ nodes, incomingSupply, outgoingDemand, setNodeConfig }: FlowSyncProps) {
  useEffect(() => {
    for (const node of nodes) {
      const incoming = incomingSupply.get(node.id) ?? undefined
      const outgoing = outgoingDemand.get(node.id) ?? undefined
      const cur = node.data as { incomingSupply?: number[]; outgoingDemand?: number[] }
      const sameIncoming = JSON.stringify(cur.incomingSupply) === JSON.stringify(incoming)
      const sameOutgoing = JSON.stringify(cur.outgoingDemand) === JSON.stringify(outgoing)
      if (!sameIncoming || !sameOutgoing) {
        setNodeConfig(node.id, { incomingSupply: incoming, outgoingDemand: outgoing })
      }
    }
  }, [incomingSupply, outgoingDemand, nodes, setNodeConfig])
}
