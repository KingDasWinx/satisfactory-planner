'use client'

import { useCallback, useRef } from 'react'
import type { Edge, ReactFlowInstance, OnConnect, OnConnectStart, OnConnectEnd, Connection } from '@xyflow/react'
import type { FactoryNode, MenuContext } from '@/lib/types/store'
import { inferPartsFromUpstream } from '@/lib/utils/inferParts'

type ConnectionHandlerProps = {
  nodes: FactoryNode[]
  edges: Edge[]
  rfInstance: React.RefObject<ReactFlowInstance | null>
  onConnect: OnConnect
  openMenu: (ctx: MenuContext) => void
}

function isLogisticsNode(type: string | undefined) {
  return type === 'splitterNode' || type === 'mergerNode' || type === 'storageNode'
}

export function useConnectionHandler({ nodes, edges, rfInstance, onConnect, openMenu }: ConnectionHandlerProps) {
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
        const outputParts = inferPartsFromUpstream(drag.nodeId, drag.handleId, nodes, edges)
        menuOpenedFromDrag.current = true
        if (outputParts.length > 0) {
          openMenu({
            type: 'output',
            nodeId: drag.nodeId,
            handleId: drag.handleId,
            outputPart: outputParts[0],
            outputParts,
            position: { x: clientX + 12, y: clientY - 20 },
            nodeFlowPosition: sourceNode.position,
            dropFlowPosition,
          })
        } else {
          // Unconnected logistics node — open generic canvas menu
          if (!dropFlowPosition) return
          openMenu({
            type: 'canvas',
            position: { x: clientX + 12, y: clientY - 20 },
            flowPosition: dropFlowPosition,
          })
        }
      } else {
        // For input handle drag, infer the part from the node's own recipe input
        // (logistics node inputs don't restrict by part — use upstream of the node itself)
        const node = nodes.find(n => n.id === drag.nodeId)
        let inputPart: string | undefined
        if (node?.type === 'machineNode') {
          const idx = parseInt(drag.handleId.replace('in-', ''), 10)
          inputPart = node.data.recipe?.inputs[idx]?.part
        }
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
    [nodes, edges, openMenu, rfInstance]
  )

  const isValidConnection = useCallback(
    (connection: Connection | { source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null }) => {
      const { source, sourceHandle, target, targetHandle } = connection
      if (source === target) return false

      const sourceNode = nodes.find((n) => n.id === source)
      const targetNode = nodes.find((n) => n.id === target)

      // Merger input: always accept — any part can enter a merger
      if (targetNode?.type === 'mergerNode') return true

      // Merger output → machine input: validate part match
      if (sourceNode?.type === 'mergerNode' && targetNode?.type === 'machineNode') {
        if (!targetHandle) return true
        const targetIdx = parseInt(targetHandle.replace('in-', ''), 10)
        const targetPart = targetNode.data.recipe?.inputs[targetIdx]?.part
        if (!targetPart) return true // target has no recipe yet — allow
        const sourceParts = inferPartsFromUpstream(source, sourceHandle ?? 'out-0', nodes, edges)
        return sourceParts.length === 0 || sourceParts.includes(targetPart)
      }

      // Splitter input: always accept any source
      if (targetNode?.type === 'splitterNode') return true

      // Splitter output → machine input: must match the part flowing through the splitter
      if (sourceNode?.type === 'splitterNode' && targetNode?.type === 'machineNode') {
        if (!targetHandle) return true
        const targetIdx = parseInt(targetHandle.replace('in-', ''), 10)
        const targetPart = targetNode.data.recipe?.inputs[targetIdx]?.part
        if (!targetPart) return true // target has no recipe yet — allow
        const sourceParts = inferPartsFromUpstream(source, sourceHandle ?? 'out-0', nodes, edges)
        return sourceParts.length === 0 || sourceParts.includes(targetPart)
      }

      // Splitter output → splitter/merger/storage: allow (logistics chain)
      if (sourceNode?.type === 'splitterNode' && isLogisticsNode(targetNode?.type)) return true

      // Storage input: always accept any source
      if (targetNode?.type === 'storageNode') return true

      // Storage output → machine input: validate part match
      if (sourceNode?.type === 'storageNode' && targetNode?.type === 'machineNode') {
        if (!targetHandle) return true
        const targetIdx = parseInt(targetHandle.replace('in-', ''), 10)
        const targetPart = targetNode.data.recipe?.inputs[targetIdx]?.part
        if (!targetPart) return true
        const sourceParts = inferPartsFromUpstream(source, sourceHandle ?? 'out-0', nodes, edges)
        return sourceParts.length === 0 || sourceParts.includes(targetPart)
      }

      // Storage output → logistics chain: allow
      if (sourceNode?.type === 'storageNode' && isLogisticsNode(targetNode?.type)) return true

      // Machine → machine: strict part match
      const sourceData = sourceNode?.type === 'machineNode' ? sourceNode.data : null
      const targetData = targetNode?.type === 'machineNode' ? targetNode.data : null
      if (!sourceData?.recipe || !targetData?.recipe) return false

      const sourceIdx = sourceHandle ? parseInt(sourceHandle.replace('out-', ''), 10) : NaN
      const targetIdx = targetHandle ? parseInt(targetHandle.replace('in-', ''), 10) : NaN
      if (isNaN(sourceIdx) || isNaN(targetIdx)) return false

      const sourcePart = sourceData.recipe.outputs[sourceIdx]?.part
      const targetPart = targetData.recipe.inputs[targetIdx]?.part
      return !!sourcePart && !!targetPart && sourcePart === targetPart
    },
    [nodes, edges]
  )

  return { handleConnect, handleConnectStart, handleConnectEnd, isValidConnection, menuOpenedFromDrag }
}
