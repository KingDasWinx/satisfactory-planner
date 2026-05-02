'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type Edge,
} from '@xyflow/react'
import { useFactoryStore } from '@/store/factoryStore'
import { useProjectStore } from '@/store/projectStore'
import { MachineNode } from '@/components/nodes/MachineNode'
import { SplitterNode } from '@/components/nodes/SplitterNode'
import { MergerNode } from '@/components/nodes/MergerNode'
import { StorageNode } from '@/components/nodes/StorageNode'
import { TextNode } from '@/components/nodes/TextNode'
import { FrameNode } from '@/components/nodes/FrameNode'
import { GhostNode } from '@/components/nodes/GhostNode'
import { FlowEdge } from '@/components/edges/FlowEdge'
import { SearchMenu } from '@/components/panels/SearchMenu'
import { ContextMenu } from '@/components/panels/ContextMenu'
import { MagicPlannerWizard } from '@/components/panels/MagicPlannerWizard'
import { ToolsBar } from '@/components/panels/ToolsBar'
import { CanvasBackground } from '@/components/layout/CanvasBackground'
import { HelperLinesOverlay } from '@/components/layout/HelperLinesOverlay'
import { MultiMachinesProvider } from '@/lib/gameDataContext'
import { useEdgeColors } from '@/lib/hooks/useEdgeColors'
import { useFlowSync } from '@/lib/hooks/useFlowSync'
import { useConnectionHandler } from '@/lib/hooks/useConnectionHandler'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { exportCanvasToPng } from '@/lib/utils/exportCanvas'
import type { Machine, MultiMachine, ParsedRecipe, Part } from '@/lib/types/game'
import type { ProjectMeta } from '@/lib/types/projects'
import type { FactoryNode } from '@/lib/types/store'

const nodeTypes = {
  machineNode: MachineNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
  storageNode: StorageNode,
  textNode: TextNode,
  frameNode: FrameNode,
}

const edgeTypes = {
  flowEdge: FlowEdge,
}

type ActiveTool = 'pointer' | 'text' | 'frame'

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
  projectId?: string
  readOnly?: boolean
}

export function FactoryEditor({ machines, recipes, multiMachines, projectId, readOnly = false }: FactoryEditorProps) {
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)
  const helperLines = useFactoryStore((s) => s.helperLines)
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
  const isDirty = useFactoryStore((s) => s.isDirty)
  const addTextNode = useFactoryStore((s) => s.addTextNode)
  const addFrameNode = useFactoryStore((s) => s.addFrameNode)

  const hydrateFromStorage = useProjectStore((s) => s.hydrateFromStorage)
  const loadProject = useProjectStore((s) => s.loadProject)
  const hydrateCloudProject = useProjectStore((s) => s.hydrateCloudProject)
  const createProjectLocal = useProjectStore((s) => s.createProjectLocal)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)

  const rfInstance = useRef<ReactFlowInstance | null>(null)
  const lastFlowMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastScreenMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isGhostActiveRef = useRef(isGhostActive)
  isGhostActiveRef.current = isGhostActive

  const [activeTool, setActiveTool] = useState<ActiveTool>('pointer')
  const activeToolRef = useRef(activeTool)
  activeToolRef.current = activeTool

  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(null)
  const frameDraftRef = useRef<FrameDraft | null>(null)

  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    async function load() {
      // View de comunidade (readOnly + projectId): busca direto da API sem sujar localStorage do visitante
      if (readOnly && projectId) {
        const res = await fetch(`/api/projects/${projectId}`).catch(() => null)
        if (res?.ok) {
          const json = await res.json().catch(() => null) as { data?: { nodes?: unknown[]; edges?: unknown[]; viewport?: unknown } | null } | null
          const flowData = json?.data
          useFactoryStore.setState({
            nodes: Array.isArray(flowData?.nodes) ? (flowData!.nodes as FactoryNode[]) : [],
            edges: Array.isArray(flowData?.edges) ? (flowData!.edges as Edge[]) : [],
            history: [],
            future: [],
          })
          const vp = flowData?.viewport as { x: number; y: number; zoom: number } | undefined
          setTimeout(() => rfInstance.current?.setViewport(vp ?? { x: 0, y: 0, zoom: 1 }), 50)
        }
        setHydrated(true)
        return
      }

      // Modo edição: hidrata do localStorage primeiro
      const { activeId, data: storedData } = hydrateFromStorage()
      const targetId = projectId ?? activeId

      if (targetId) {
        const localData = loadProject(targetId)
        if (localData) {
          useFactoryStore.setState({ nodes: localData.nodes, edges: localData.edges, history: [], future: [] })
          setTimeout(() => rfInstance.current?.setViewport(localData.viewport), 50)
          setHydrated(true)
          return
        }

        // Não está em localStorage (cloud project em nova sessão) → busca da API e salva localmente
        if (projectId) {
          const remoteData = await hydrateCloudProject(projectId)
          if (remoteData) {
            useFactoryStore.setState({ nodes: remoteData.nodes, edges: remoteData.edges, history: [], future: [] })
            setTimeout(() => rfInstance.current?.setViewport(remoteData.viewport), 50)
            setHydrated(true)
            return
          }
        }
      }

      // Nenhum projeto encontrado → cria um local novo
      if (!storedData) createProjectLocal({ name: 'Minha fábrica', description: '', isPublic: false })
      setHydrated(true)
    }

    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useAutoSave({ rfInstance })

  const { coloredEdges, incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, effectiveRates, efficiencies, autoNMachines } =
    useEdgeColors(nodes, edges, multiMachines)
  useFlowSync({ nodes, incomingSupply, outgoingDemand, incomingPotential, incomingRatesByPart, outgoingRatesByPart, effectiveRates, efficiencies, autoNMachines, setNodeConfig })

  const { handleConnect, handleConnectStart, handleConnectEnd, isValidConnection, menuOpenedFromDrag } =
    useConnectionHandler({ nodes, edges, rfInstance, onConnect, openMenu })

  useKeyboardShortcuts()

  useEffect(() => {
    if (readOnly) return
    function onCtx(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-reactflow]')) {
        e.preventDefault()
      }
    }
    window.addEventListener('contextmenu', onCtx, { capture: true })
    return () => window.removeEventListener('contextmenu', onCtx, { capture: true } as unknown as boolean)
  }, [readOnly])

  useEffect(() => {
    if (readOnly) return
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
  }, [readOnly])

  useEffect(() => {
    function onGlobalMouseMove(e: MouseEvent) {
      lastScreenMousePos.current = { x: e.clientX, y: e.clientY }
      if (!rfInstance.current) return
      const flowPos = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      lastFlowMousePos.current = flowPos
      if (!isGhostActiveRef.current) return
      setGhostPosition(flowPos, { x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', onGlobalMouseMove)
    return () => window.removeEventListener('mousemove', onGlobalMouseMove)
  }, [setGhostPosition])

  useEffect(() => {
    if (!isGhostActive || !rfInstance.current) return
    // Ao ativar o ghost (Ctrl+V), posiciona imediatamente no mouse atual (sem precisar mover).
    setGhostPosition(lastFlowMousePos.current, lastScreenMousePos.current)
  }, [isGhostActive, setGhostPosition])

  useEffect(() => {
    if (readOnly) return
    function onMouseDown(e: MouseEvent) {
      if (activeToolRef.current !== 'frame') return
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
  }, [readOnly, addFrameNode])

  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null)

  const onPaneClickWithDblDetect = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return
      if (menuOpenedFromDrag.current) {
        menuOpenedFromDrag.current = false
        return
      }
      if (isGhostActive && rfInstance.current) {
        commitPaste(lastFlowMousePos.current)
        return
      }
      if (activeToolRef.current === 'text' && rfInstance.current) {
        const flowPosition = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        addTextNode(flowPosition)
        setActiveTool('pointer')
        return
      }
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
    [readOnly, isGhostActive, commitPaste, closeMenu, openMenu, menuOpenedFromDrag, addTextNode]
  )

  function handleLoadProject(meta: ProjectMeta) {
    const data = loadProject(meta.id)
    if (!data) return
    useFactoryStore.setState({ nodes: data.nodes, edges: data.edges, history: [], future: [] })
    setTimeout(() => rfInstance.current?.setViewport(data.viewport), 50)
  }

  async function handleExportPng() {
    if (!rfInstance.current) return
    const activeMeta = projects.find((p) => p.id === activeProjectId)
    await exportCanvasToPng(rfInstance.current, activeMeta?.name ?? 'fabrica')
  }

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
      <div className={`h-full w-full relative ${!readOnly && activeTool !== 'pointer' ? 'cursor-crosshair' : ''}`}>
        <ReactFlow
          nodes={nodes}
          edges={coloredEdges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : handleConnect}
          onConnectStart={readOnly ? undefined : handleConnectStart}
          onConnectEnd={readOnly ? undefined : handleConnectEnd}
          isValidConnection={readOnly ? undefined : isValidConnection}
          onPaneClick={onPaneClickWithDblDetect}
          onPaneContextMenu={(e) => {
            if (readOnly) return
            e.preventDefault()
            if (!rfInstance.current) return
            const flowPosition = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
            openMenu({ type: 'context', position: { x: e.clientX, y: e.clientY }, flowPosition })
          }}
          onNodeContextMenu={(e, node) => {
            if (readOnly) return
            e.preventDefault()
            if (!rfInstance.current) return
            const flowPosition = rfInstance.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
            openMenu({ type: 'nodeContext', nodeId: node.id, position: { x: e.clientX, y: e.clientY }, flowPosition })
          }}
          zoomOnDoubleClick={false}
          panOnDrag={readOnly || activeTool !== 'frame'}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          snapToGrid={!readOnly}
          snapGrid={[20, 20]}
          onInit={(instance) => { rfInstance.current = instance as unknown as ReactFlowInstance }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={readOnly ? null : 'Delete'}
          minZoom={0.2}
          maxZoom={2}
        >
          <CanvasBackground />
          {!readOnly && helperLines && rfInstance.current && (
            <HelperLinesOverlay
              viewport={rfInstance.current.getViewport()}
              guides={helperLines.guides}
              spacing={helperLines.spacing}
            />
          )}
          <Controls position="bottom-left" />
          <MiniMap
            nodeColor={(n) => n.type === 'machineNode' ? '#f59e0b' : '#475569'}
            maskColor="rgba(15,17,23,0.7)"
            position="bottom-right"
          />

          {nodes.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div className="text-center text-slate-600">
                <div className="text-5xl mb-3">⚙</div>
                <p className="text-lg font-medium">Duplo clique para adicionar uma receita</p>
                <p className="text-sm mt-1">Arraste as entradas para criar fornecedores automaticamente</p>
              </div>
            </div>
          )}
        </ReactFlow>

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

        {/* Badge de modo leitura */}
        {readOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-1.5 text-xs font-medium text-slate-400 shadow-lg backdrop-blur-sm pointer-events-none select-none">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Modo visualização
          </div>
        )}

        {!readOnly && (
          <ToolsBar
            activeTool={activeTool}
            onSetTool={setActiveTool}
            onExportPng={handleExportPng}
            onUndo={undo}
            onRedo={redo}
            onLoadProject={handleLoadProject}
            projectName={activeMeta?.name ?? ''}
            isSaved={!isDirty}
          />
        )}

        {!readOnly && <GhostNode />}
        {!readOnly && <SearchMenu recipes={recipes} machines={machines} />}
        {!readOnly && <ContextMenu />}
        {!readOnly && <MagicPlannerWizard recipes={recipes} machines={machines} />}
      </div>
    </MultiMachinesProvider>
  )
}
