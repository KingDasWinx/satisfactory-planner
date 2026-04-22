'use client'

import { useCallback, useRef } from 'react'
import type { ReactFlowInstance, OnConnect, OnConnectStart, OnConnectEnd, Connection } from '@xyflow/react'
import type { MachineNode, MenuContext } from '@/lib/types/store'

type ConnectionHandlerProps = {
  nodes: MachineNode[]
  rfInstance: React.RefObject<ReactFlowInstance | null>
  onConnect: OnConnect
  openMenu: (ctx: MenuContext) => void
}

export function useConnectionHandler({ nodes, rfInstance, onConnect, openMenu }: ConnectionHandlerProps) {
  const connectionJustMade = useRef(false)
  const pendingDrag = useRef<{
    nodeId: string
    handleId: string
    handleType: 'source' | 'target'
  } | null>(null)
  const menuOpenedFromDrag = useRef(false)

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      connectionJustMade.current = true
      onConnect(connection)
    },
    [onConnect]
  )

  const handleConnectStart = useCallback<OnConnectStart>((_event, params) => {
    connectionJustMade.current = false
    if (!params.nodeId || !params.handleId || !params.handleType) return
    pendingDrag.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    }
  }, [])

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      if (connectionJustMade.current) {
        connectionJustMade.current = false
        pendingDrag.current = null
        return
      }
      // Only open popup when dropped on empty canvas (isValid is null = no handle was targeted)
      if (connectionState.isValid !== null) {
        pendingDrag.current = null
        return
      }

      const drag = pendingDrag.current
      pendingDrag.current = null
      if (!drag) return

      const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).changedTouches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).changedTouches[0].clientY

      const dropFlowPosition = rfInstance.current
        ? rfInstance.current.screenToFlowPosition({ x: clientX, y: clientY })
        : undefined

      const sourceNode = nodes.find((n) => n.id === drag.nodeId)
      if (!sourceNode) return

      if (drag.handleType === 'source') {
        const idx = parseInt(drag.handleId.replace('out-', ''), 10)
        const outputPart = sourceNode.data.recipe?.outputs[idx]?.part
        if (!outputPart) return
        menuOpenedFromDrag.current = true
        openMenu({
          type: 'output',
          nodeId: drag.nodeId,
          handleId: drag.handleId,
          outputPart,
          position: { x: clientX + 12, y: clientY - 20 },
          nodeFlowPosition: sourceNode.position,
          dropFlowPosition,
        })
      } else {
        const idx = parseInt(drag.handleId.replace('in-', ''), 10)
        const inputPart = sourceNode.data.recipe?.inputs[idx]?.part
        if (!inputPart) return
        menuOpenedFromDrag.current = true
        openMenu({
          type: 'input',
          nodeId: drag.nodeId,
          handleId: drag.handleId,
          inputPart,
          position: { x: clientX - 288, y: clientY - 20 },
          nodeFlowPosition: sourceNode.position,
          dropFlowPosition,
        })
      }
    },
    [nodes, openMenu, rfInstance]
  )

  const isValidConnection = useCallback(
    (connection: Connection | { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null }) => {
      const { source, sourceHandle, target, targetHandle } = connection
      if (source === target) return false

      const sourceNode = nodes.find((n) => n.id === source)
      const targetNode = nodes.find((n) => n.id === target)
      if (!sourceNode?.data.recipe || !targetNode?.data.recipe) return false

      const sourceIdx = sourceHandle ? parseInt(sourceHandle.replace('out-', ''), 10) : NaN
      const targetIdx = targetHandle ? parseInt(targetHandle.replace('in-', ''), 10) : NaN
      if (isNaN(sourceIdx) || isNaN(targetIdx)) return false

      const sourcePart = sourceNode.data.recipe.outputs[sourceIdx]?.part
      const targetPart = targetNode.data.recipe.inputs[targetIdx]?.part
      return !!sourcePart && !!targetPart && sourcePart === targetPart
    },
    [nodes]
  )

  return { handleConnect, handleConnectStart, handleConnectEnd, isValidConnection, menuOpenedFromDrag }
}
