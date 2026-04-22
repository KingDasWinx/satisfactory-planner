'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react'
import { useFactoryStore } from '@/store/factoryStore'
import { MachineNode } from '@/components/nodes/MachineNode'
import { SplitterNode } from '@/components/nodes/SplitterNode'
import { MergerNode } from '@/components/nodes/MergerNode'
import { GhostNode } from '@/components/nodes/GhostNode'
import { SearchMenu } from '@/components/panels/SearchMenu'
import { CanvasBackground } from '@/components/layout/CanvasBackground'
import { MultiMachinesProvider } from '@/lib/gameDataContext'
import { useEdgeColors } from '@/lib/hooks/useEdgeColors'
import { useFlowSync } from '@/lib/hooks/useFlowSync'
import { useConnectionHandler } from '@/lib/hooks/useConnectionHandler'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import type { Machine, MultiMachine, ParsedRecipe, Part } from '@/lib/types/game'

const nodeTypes = { machineNode: MachineNode, splitterNode: SplitterNode, mergerNode: MergerNode }

interface FactoryEditorProps {
  machines: Machine[]
  recipes: ParsedRecipe[]
  parts: Part[]
  multiMachines: MultiMachine[]
}

export function FactoryEditor({ machines, recipes, multiMachines }: FactoryEditorProps) {
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)
  const onNodesChange = useFactoryStore((s) => s.onNodesChange)
  const onEdgesChange = useFactoryStore((s) => s.onEdgesChange)
  const onConnect = useFactoryStore((s) => s.onConnect)
  const openMenu = useFactoryStore((s) => s.openMenu)
  const closeMenu = useFactoryStore((s) => s.closeMenu)
  const setNodeConfig = useFactoryStore((s) => s.setNodeConfig)
  const isGhostActive = useFactoryStore((s) => s.isGhostActive)
  const commitPaste = useFactoryStore((s) => s.commitPaste)
  const setGhostPosition = useFactoryStore((s) => s.setGhostPosition)

  const rfInstance = useRef<ReactFlowInstance | null>(null)
  // Ref para guardar posição de flow do mouse (usada no click-to-commit via onPaneClick)
  const lastFlowMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  // Ref do estado atual de isGhostActive sem criar dependência de closure
  const isGhostActiveRef = useRef(isGhostActive)
  isGhostActiveRef.current = isGhostActive

  const { coloredEdges, incomingSupply, outgoingDemand } = useEdgeColors(nodes, edges, multiMachines)

  useFlowSync({ nodes, incomingSupply, outgoingDemand, setNodeConfig })

  const { handleConnect, handleConnectStart, handleConnectEnd, isValidConnection, menuOpenedFromDrag } =
    useConnectionHandler({ nodes, edges, rfInstance, onConnect, openMenu })

  useKeyboardShortcuts()

  // Mouse global para atualizar ghost — captura eventos mesmo quando o ReactFlow os consome
  useEffect(() => {
    function onGlobalMouseMove(e: MouseEvent) {
      if (!isGhostActiveRef.current || !rfInstance.current) return
      const flowPos = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      // Passa tanto as coords de flow (para cálculo de offset) quanto de tela (para renderização CSS)
      setGhostPosition(flowPos, { x: e.clientX, y: e.clientY })
      lastFlowMousePos.current = flowPos
    }
    window.addEventListener('mousemove', onGlobalMouseMove)
    return () => window.removeEventListener('mousemove', onGlobalMouseMove)
  }, [setGhostPosition])

  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null)

  const onPaneClickWithDblDetect = useCallback(
    (e: React.MouseEvent) => {
      if (menuOpenedFromDrag.current) {
        menuOpenedFromDrag.current = false
        return
      }

      // Colar somente em clique no pane (canvas vazio) — onPaneClick não dispara para nós
      if (isGhostActive && rfInstance.current) {
        commitPaste(lastFlowMousePos.current)
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
    [isGhostActive, commitPaste, closeMenu, openMenu, menuOpenedFromDrag]
  )

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
          <CanvasBackground />

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

        <GhostNode />
        <SearchMenu recipes={recipes} machines={machines} />
      </div>
    </MultiMachinesProvider>
  )
}
