'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  type OnConnect,
  type OnConnectStart,
  type OnConnectEnd,
  type Connection,
} from '@xyflow/react'
import { useFactoryStore } from '@/store/factoryStore'
import { MachineNode } from '@/components/nodes/MachineNode'
import { SearchMenu } from '@/components/panels/SearchMenu'
import { MultiMachinesProvider } from '@/lib/gameDataContext'
import { calcNodeRates, edgeSufficiencyColor } from '@/lib/flowCalc'
import { fmt } from '@/components/nodes/MachineNode'
import type { Machine, MultiMachine, ParsedRecipe, Part } from '@/lib/gameData'

const nodeTypes = { machineNode: MachineNode }

type FactoryEditorProps = {
  machines: Machine[]
  recipes: ParsedRecipe[]
  parts: Part[]
  multiMachines: MultiMachine[]
}

export function FactoryEditor({ machines, recipes, multiMachines }: FactoryEditorProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, openMenu, closeMenu, setNodeConfig } =
    useFactoryStore()
  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null)
  const connectionJustMade = useRef(false)
  const pendingDrag = useRef<{
    nodeId: string
    handleId: string
    handleType: 'source' | 'target'
  } | null>(null)
  const menuOpenedFromDrag = useRef(false)

  const onPaneClickWithDblDetect = useCallback(
    (e: React.MouseEvent) => {
      if (menuOpenedFromDrag.current) {
        menuOpenedFromDrag.current = false
        return
      }
      closeMenu()
      const now = Date.now()
      const last = lastPaneClick.current
      if (last && now - last.time < 350 && Math.abs(e.clientX - last.x) < 10 && Math.abs(e.clientY - last.y) < 10) {
        lastPaneClick.current = null
        if (!rfInstance.current) return
        const flowPosition = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        openMenu({ type: 'canvas', position: { x: e.clientX, y: e.clientY }, flowPosition })
      } else {
        lastPaneClick.current = { time: now, x: e.clientX, y: e.clientY }
      }
    },
    [openMenu, closeMenu]
  )

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
    [nodes, openMenu]
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

  // Compute per-node flow data: rates, incomingSupply, outgoingDemand, colored edges
  const { coloredEdges, nodeFlowData } = useMemo(() => {
    const rateMap = new Map<string, { inputs: number[]; outputs: number[] }>()
    for (const node of nodes) {
      rateMap.set(node.id, calcNodeRates(node.data, multiMachines))
    }

    // Pass 1: count how many edges share each (source, sourceHandle) — supply is split equally
    const outputEdgeCount = new Map<string, number>()
    for (const edge of edges) {
      if (!edge.sourceHandle) continue
      const key = `${edge.source}::${edge.sourceHandle}`
      outputEdgeCount.set(key, (outputEdgeCount.get(key) ?? 0) + 1)
    }

    // incoming supply per (nodeId, inputHandleIdx)
    const incomingSupply = new Map<string, number[]>()
    // total demand placed on each (nodeId, outputHandleIdx) by all downstream consumers
    const outgoingDemand = new Map<string, number[]>()

    // Pass 2: compute per-edge supply (divided) and accumulate
    const coloredEdges = edges.map((edge) => {
      if (!edge.sourceHandle || !edge.targetHandle) return { ...edge, animated: true }
      const sourceRates = rateMap.get(edge.source)
      const targetRates = rateMap.get(edge.target)
      const sourceIdx = parseInt(edge.sourceHandle.replace('out-', ''), 10)
      const targetIdx = parseInt(edge.targetHandle.replace('in-', ''), 10)

      const totalSupply = sourceRates?.outputs[sourceIdx] ?? 0
      const fanOut = outputEdgeCount.get(`${edge.source}::${edge.sourceHandle}`) ?? 1
      const supplyThisEdge = totalSupply / fanOut   // split equally among consumers
      const demand = targetRates?.inputs[targetIdx] ?? 0

      const color = edgeSufficiencyColor(supplyThisEdge, demand)

      // accumulate supply arriving at target input handle
      if (!incomingSupply.has(edge.target)) incomingSupply.set(edge.target, [])
      const tArr = incomingSupply.get(edge.target)!
      tArr[targetIdx] = (tArr[targetIdx] ?? 0) + supplyThisEdge

      // accumulate demand placed on source output handle
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

    return { coloredEdges, nodeFlowData: { incomingSupply, outgoingDemand } }
  }, [edges, nodes, multiMachines])

  // Push computed supply/demand back into node data so MachineNode can render live values
  useEffect(() => {
    for (const node of nodes) {
      const incoming = nodeFlowData.incomingSupply.get(node.id) ?? undefined
      const outgoing = nodeFlowData.outgoingDemand.get(node.id) ?? undefined
      const cur = node.data
      const sameIncoming = JSON.stringify(cur.incomingSupply) === JSON.stringify(incoming)
      const sameOutgoing = JSON.stringify(cur.outgoingDemand) === JSON.stringify(outgoing)
      if (!sameIncoming || !sameOutgoing) {
        setNodeConfig(node.id, { incomingSupply: incoming, outgoingDemand: outgoing })
      }
    }
  }, [nodeFlowData, nodes, setNodeConfig])

  return (
    <MultiMachinesProvider value={multiMachines}>
      <div className="h-full w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={coloredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          isValidConnection={isValidConnection}
          onPaneClick={onPaneClickWithDblDetect}
          zoomOnDoubleClick={false}
          snapToGrid
          snapGrid={[20, 20]}
          onInit={(instance) => { rfInstance.current = instance as unknown as ReactFlowInstance }}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          minZoom={0.2}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2330" />
          <Controls className="[&>button]:bg-slate-800 [&>button]:border-slate-600 [&>button]:text-slate-300 [&>button:hover]:bg-slate-700" />
          <MiniMap
            className="!bg-slate-900 !border-slate-700"
            nodeColor="#f59e0b"
            maskColor="rgba(0,0,0,0.6)"
          />

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div className="text-center text-slate-600">
                <div className="text-5xl mb-3">⚙</div>
                <p className="text-lg font-medium">Duplo clique para adicionar uma receita</p>
                <p className="text-sm mt-1">Arraste as entradas para criar fornecedores automaticamente</p>
              </div>
            </div>
          )}
        </ReactFlow>

        <SearchMenu recipes={recipes} machines={machines} />
      </div>
    </MultiMachinesProvider>
  )
}
