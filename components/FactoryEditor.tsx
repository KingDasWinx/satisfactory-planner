'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  type ReactFlowInstance,
} from '@xyflow/react'
import { useFactoryStore } from '@/store/factoryStore'
import { useProjectStore } from '@/store/projectStore'
import { MachineNode } from '@/components/nodes/MachineNode'
import { SplitterNode } from '@/components/nodes/SplitterNode'
import { MergerNode } from '@/components/nodes/MergerNode'
import { TextNode } from '@/components/nodes/TextNode'
import { FrameNode } from '@/components/nodes/FrameNode'
import { GhostNode } from '@/components/nodes/GhostNode'
import { SearchMenu } from '@/components/panels/SearchMenu'
import { ToolsBar } from '@/components/panels/ToolsBar'
import { CanvasBackground } from '@/components/layout/CanvasBackground'
import { MultiMachinesProvider } from '@/lib/gameDataContext'
import { useEdgeColors } from '@/lib/hooks/useEdgeColors'
import { useFlowSync } from '@/lib/hooks/useFlowSync'
import { useConnectionHandler } from '@/lib/hooks/useConnectionHandler'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { exportCanvasToPng } from '@/lib/utils/exportCanvas'
import type { Machine, MultiMachine, ParsedRecipe, Part } from '@/lib/types/game'
import type { ProjectMeta } from '@/lib/types/projects'

const nodeTypes = {
  machineNode: MachineNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
  textNode: TextNode,
  frameNode: FrameNode,
}

type ActiveTool = 'pointer' | 'text' | 'frame'

// Tamanho mínimo para criar um frame (em px de tela — antes da conversão para flow)
const FRAME_MIN_SIZE = 20

interface FrameDraft {
  startScreen: { x: number; y: number }
  currentScreen: { x: number; y: number }
}

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
  const undo = useFactoryStore((s) => s.undo)
  const redo = useFactoryStore((s) => s.redo)
  const addTextNode = useFactoryStore((s) => s.addTextNode)
  const addFrameNode = useFactoryStore((s) => s.addFrameNode)

  const hydrateFromStorage = useProjectStore((s) => s.hydrateFromStorage)
  const loadProject = useProjectStore((s) => s.loadProject)
  const createProject = useProjectStore((s) => s.createProject)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)

  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const lastFlowMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isGhostActiveRef = useRef(isGhostActive)
  isGhostActiveRef.current = isGhostActive

  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer')
  const activeToolRef = useRef(activeTool)
  activeToolRef.current = activeTool

  // Estado do retângulo de seleção enquanto desenha o frame
  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(null)
  const frameDraftRef = useRef<FrameDraft | null>(null)

  // Hydrate store from localStorage on first mount
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const { activeId, data } = hydrateFromStorage()
    if (data && activeId) {
      useFactoryStore.setState({
        nodes: data.nodes,
        edges: data.edges,
        history: [],
        future: [],
      })
      setTimeout(() => {
        rfInstance.current?.setViewport(data.viewport)
      }, 50)
    } else {
      createProject('Minha fábrica')
    }
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAutoSave({ rfInstance })

  const { coloredEdges, incomingSupply, outgoingDemand } = useEdgeColors(nodes, edges, multiMachines)
  useFlowSync({ nodes, incomingSupply, outgoingDemand, setNodeConfig })

  const { handleConnect, handleConnectStart, handleConnectEnd, isValidConnection, menuOpenedFromDrag } =
    useConnectionHandler({ nodes, edges, rfInstance, onConnect, openMenu })

  useKeyboardShortcuts()

  // Atalhos de teclado para as ferramentas
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === 't' || e.key === 'T') setActiveTool((t) => t === 'text' ? 'pointer' : 'text')
      if (e.key === 'f' || e.key === 'F') setActiveTool((t) => t === 'frame' ? 'pointer' : 'frame')
      if (e.key === 'Escape') {
        setActiveTool('pointer')
        setFrameDraft(null)
        frameDraftRef.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Ghost paste mouse tracking
  useEffect(() => {
    function onGlobalMouseMove(e: MouseEvent) {
      if (!isGhostActiveRef.current || !rfInstance.current) return
      const flowPos = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setGhostPosition(flowPos, { x: e.clientX, y: e.clientY })
      lastFlowMousePos.current = flowPos
    }
    window.addEventListener('mousemove', onGlobalMouseMove)
    return () => window.removeEventListener('mousemove', onGlobalMouseMove)
  }, [setGhostPosition])

  // Frame draw: captura mousedown/mousemove/mouseup no window para funcionar
  // independente de qual elemento está sob o cursor (xyflow, nós, etc.)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (activeToolRef.current !== 'frame') return
      // Ignora cliques em botões da ToolsBar e outros overlays fora do canvas
      const target = e.target as HTMLElement
      if (target.closest('[data-toolbar]')) return
      e.preventDefault()
      const draft: FrameDraft = {
        startScreen: { x: e.clientX, y: e.clientY },
        currentScreen: { x: e.clientX, y: e.clientY },
      }
      frameDraftRef.current = draft
      setFrameDraft({ ...draft })
    }
    function onMouseMove(e: MouseEvent) {
      if (!frameDraftRef.current) return
      const next: FrameDraft = {
        startScreen: frameDraftRef.current.startScreen,
        currentScreen: { x: e.clientX, y: e.clientY },
      }
      frameDraftRef.current = next
      setFrameDraft({ ...next })
    }
    function onMouseUp() {
      const draft = frameDraftRef.current
      if (!draft || !rfInstance.current) {
        frameDraftRef.current = null
        setFrameDraft(null)
        return
      }

      const x0 = Math.min(draft.startScreen.x, draft.currentScreen.x)
      const y0 = Math.min(draft.startScreen.y, draft.currentScreen.y)
      const x1 = Math.max(draft.startScreen.x, draft.currentScreen.x)
      const y1 = Math.max(draft.startScreen.y, draft.currentScreen.y)

      if (x1 - x0 > FRAME_MIN_SIZE && y1 - y0 > FRAME_MIN_SIZE) {
        const topLeft = rfInstance.current.screenToFlowPosition({ x: x0, y: y0 })
        const bottomRight = rfInstance.current.screenToFlowPosition({ x: x1, y: y1 })
        addFrameNode(topLeft, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      }

      frameDraftRef.current = null
      setFrameDraft(null)
      setActiveTool('pointer')
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [addFrameNode])

  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null)

  const onPaneClickWithDblDetect = useCallback(
    (e: React.MouseEvent) => {
      if (menuOpenedFromDrag.current) {
        menuOpenedFromDrag.current = false
        return
      }

      if (isGhostActive && rfInstance.current) {
        commitPaste(lastFlowMousePos.current)
        return
      }

      // Ferramenta de texto: cria no clique
      if (activeToolRef.current === 'text' && rfInstance.current) {
        const flowPosition = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        addTextNode(flowPosition)
        setActiveTool('pointer')
        return
      }

      // Ferramenta frame é tratada pelo mousedown/mouseup — não faz nada no click
      if (activeToolRef.current === 'frame') return

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
    [isGhostActive, commitPaste, closeMenu, openMenu, menuOpenedFromDrag, addTextNode]
  )

  function handleLoadProject(meta: ProjectMeta) {
    const data = loadProject(meta.id)
    if (!data) return
    useFactoryStore.setState({
      nodes: data.nodes,
      edges: data.edges,
      history: [],
      future: [],
    })
    setTimeout(() => rfInstance.current?.setViewport(data.viewport), 50)
  }

  async function handleExportPng() {
    if (!rfInstance.current) return
    const activeMeta = projects.find((p) => p.id === activeProjectId)
    await exportCanvasToPng(rfInstance.current, activeMeta?.name ?? 'fabrica')
  }

  // Calcula o retângulo do preview em coordenadas de tela
  const draftRect = frameDraft ? {
    left:   Math.min(frameDraft.startScreen.x, frameDraft.currentScreen.x),
    top:    Math.min(frameDraft.startScreen.y, frameDraft.currentScreen.y),
    width:  Math.abs(frameDraft.currentScreen.x - frameDraft.startScreen.x),
    height: Math.abs(frameDraft.currentScreen.y - frameDraft.startScreen.y),
  } : null

  const activeMeta = projects.find((p) => p.id === activeProjectId)

  if (!hydrated) return null

  return (
    <MultiMachinesProvider value={multiMachines}>
      <div className={`h-full w-full relative ${activeTool !== 'pointer' ? 'cursor-crosshair' : ''}`}>
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
          panOnDrag={activeTool !== 'frame'}
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
          <Controls position="bottom-left" />
          <MiniMap
            nodeColor={(n) => n.type === 'machineNode' ? '#f59e0b' : '#475569'}
            maskColor="rgba(15,17,23,0.7)"
            position="bottom-right"
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

        {/* Preview do frame sendo desenhado */}
        {draftRect && draftRect.width > 2 && draftRect.height > 2 && (
          <div
            className="fixed pointer-events-none z-20 rounded-lg"
            style={{
              left: draftRect.left,
              top: draftRect.top,
              width: draftRect.width,
              height: draftRect.height,
              border: '2px dashed #f59e0b99',
              background: '#f59e0b08',
            }}
          />
        )}

        <ToolsBar
          activeTool={activeTool}
          onSetTool={setActiveTool}
          onExportPng={handleExportPng}
          onUndo={undo}
          onRedo={redo}
          onLoadProject={handleLoadProject}
          projectName={activeMeta?.name ?? ''}
          isSaved={true}
        />

        <GhostNode />
        <SearchMenu recipes={recipes} machines={machines} />
      </div>
    </MultiMachinesProvider>
  )
}
