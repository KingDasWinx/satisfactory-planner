'use client'

import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react'
import type { Machine, ParsedRecipe } from '@/lib/types/game'
import type { MachineNodeData, MachineNode, SplitterNode, MergerNode, TextNode, FrameNode, FactoryNode, MenuContext, ClipboardData, HistoryEntry } from '@/lib/types/store'

export type { MachineNodeData, MachineNode, SplitterNode, MergerNode, TextNode, FrameNode, FactoryNode, MenuContext }

const COMPUTED_KEYS = new Set<keyof MachineNodeData>(['incomingSupply', 'outgoingDemand'])

type FactoryStore = {
  nodes: FactoryNode[]
  edges: Edge[]
  menu: MenuContext | null

  history: HistoryEntry[]
  future: HistoryEntry[]
  clipboard: ClipboardData | null
  isGhostActive: boolean
  // ghostPosition mantém coordenadas de FLOW (para cálculo de offset no commitPaste)
  ghostPosition: { x: number; y: number }
  // ghostScreenPosition mantém coordenadas de TELA (para renderização do GhostNode)
  ghostScreenPosition: { x: number; y: number }

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  openMenu: (ctx: MenuContext) => void
  closeMenu: () => void

  addRecipeNode: (recipe: ParsedRecipe, machine: Machine, flowPosition: XYPosition) => string
  addSplitterNode: (flowPosition: XYPosition) => string
  addMergerNode: (flowPosition: XYPosition) => string
  setRecipe: (nodeId: string, recipe: ParsedRecipe) => void
  setNodeConfig: (nodeId: string, config: Partial<Pick<MachineNodeData, 'nMachines' | 'clockSpeed' | 'minerVariant' | 'minerCapacity' | 'outputRateOverride' | 'incomingSupply' | 'outgoingDemand'>>) => void

  addTextNode: (flowPosition: XYPosition) => string
  addFrameNode: (flowPosition: XYPosition, width?: number, height?: number) => string
  setTextNodeContent: (nodeId: string, text: string) => void
  setFrameNodeLabel: (nodeId: string, label: string) => void
  setFrameNodeLocked: (nodeId: string, locked: boolean) => void

  copyNodes: () => void
  startPaste: () => void
  commitPaste: (flowPosition: XYPosition) => void
  cancelPaste: () => void
  undo: () => void
  redo: () => void
  setGhostPosition: (flowPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void

  _pushHistory: () => void
}

let nodeCounter = 0

function deepCopyNodes(nodes: FactoryNode[]): FactoryNode[] {
  return nodes.map(n => ({ ...n, data: { ...n.data } }) as FactoryNode)
}

function shallowCopyEdges(edges: Edge[]): Edge[] {
  return edges.map(e => ({ ...e }))
}

export const useFactoryStore = create<FactoryStore>((set, get) => ({
  nodes: [] as FactoryNode[],
  edges: [],
  menu: null,
  history: [],
  future: [],
  clipboard: null,
  isGhostActive: false,
  ghostPosition: { x: 0, y: 0 },
  ghostScreenPosition: { x: 0, y: 0 },

  onNodesChange: (changes) => {
    // Push history UMA VEZ por batch (não por change individual) para evitar
    // múltiplos estados quando vários nós são movidos/deletados juntos
    const hasPositionEnd = changes.some(c => c.type === 'position' && !c.dragging)
    const hasRemove = changes.some(c => c.type === 'remove')
    // 'dimensions' é emitido pelo NodeResizer ao terminar o resize de um frame
    const hasDimensionsEnd = changes.some(c => c.type === 'dimensions' && !(c as { resizing?: boolean }).resizing)
    if (hasPositionEnd || hasRemove || hasDimensionsEnd) get()._pushHistory()

    const { nodes } = get()

    // Quando um frame travado é arrastado, propaga o delta para os nós contidos
    const positionChanges = changes.filter(
      (c): c is Extract<typeof c, { type: 'position' }> => c.type === 'position' && c.dragging === true
    )
    let extraChanges: typeof changes = []
    for (const change of positionChanges) {
      const frameNode = nodes.find(n => n.id === change.id)
      if (!frameNode || frameNode.type !== 'frameNode') continue
      const frameData = frameNode.data as import('@/lib/types/store').FrameNodeData
      if (!frameData.locked) continue

      const newPos = change.position
      if (!newPos) continue
      const dx = newPos.x - frameNode.position.x
      const dy = newPos.y - frameNode.position.y
      if (dx === 0 && dy === 0) continue

      const fw = (frameNode.style?.width as number | undefined) ?? 400
      const fh = (frameNode.style?.height as number | undefined) ?? 300

      // Nós cujo centro está dentro do frame recebem o mesmo delta
      const children = nodes.filter(n => {
        if (n.id === frameNode.id) return false
        const nx = n.position.x
        const ny = n.position.y
        return (
          nx >= frameNode.position.x &&
          ny >= frameNode.position.y &&
          nx <= frameNode.position.x + fw &&
          ny <= frameNode.position.y + fh
        )
      })
      for (const child of children) {
        extraChanges.push({
          type: 'position',
          id: child.id,
          dragging: true,
          position: { x: child.position.x + dx, y: child.position.y + dy },
        } as (typeof changes)[number])
      }
    }

    set((state) => ({
      nodes: applyNodeChanges([...changes, ...extraChanges], state.nodes) as FactoryNode[],
    }))
  },

  onEdgesChange: (changes) => {
    if (changes.some(c => c.type === 'remove')) get()._pushHistory()
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }))
  },

  onConnect: (connection) => {
    get()._pushHistory()
    set((state) => ({
      edges: addEdge({ ...connection, animated: true }, state.edges),
    }))
  },

  openMenu: (ctx) => set({ menu: ctx }),
  closeMenu: () => set({ menu: null }),

  addRecipeNode: (recipe, machine, flowPosition) => {
    get()._pushHistory()
    nodeCounter++
    const id = `machine-${nodeCounter}`
    const newNode: MachineNode = {
      id,
      type: 'machineNode',
      position: flowPosition,
      data: { machine, recipe, availableRecipes: [recipe], nMachines: 1, clockSpeed: 1 },
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  addSplitterNode: (flowPosition) => {
    get()._pushHistory()
    nodeCounter++
    const id = `splitter-${nodeCounter}`
    const newNode: SplitterNode = {
      id,
      type: 'splitterNode',
      position: flowPosition,
      data: {},
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  addMergerNode: (flowPosition) => {
    get()._pushHistory()
    nodeCounter++
    const id = `merger-${nodeCounter}`
    const newNode: MergerNode = {
      id,
      type: 'mergerNode',
      position: flowPosition,
      data: {},
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  setRecipe: (nodeId, recipe) => {
    get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? ({ ...n, data: { ...n.data, recipe } } as FactoryNode) : n
      ),
    }))
  },

  setNodeConfig: (nodeId, config) => {
    // Só faz push ao histórico se há pelo menos uma chave não-computada na config
    const hasNonComputed = (Object.keys(config) as (keyof MachineNodeData)[]).some(k => !COMPUTED_KEYS.has(k))
    if (hasNonComputed) get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? ({ ...n, data: { ...n.data, ...config } } as FactoryNode) : n
      ),
    }))
  },

  // Deep copy do data para evitar referências compartilhadas entre snapshots
  _pushHistory: () => {
    const { nodes, edges, history } = get()
    const snapshot: HistoryEntry = {
      nodes: deepCopyNodes(nodes),
      edges: shallowCopyEdges(edges),
    }
    set({ history: [...history.slice(-49), snapshot], future: [] })
  },

  undo: () => {
    const { history, future, nodes, edges } = get()
    if (history.length === 0) return
    const prev = history[history.length - 1]
    set({
      nodes: deepCopyNodes(prev.nodes),
      edges: shallowCopyEdges(prev.edges),
      history: history.slice(0, -1),
      future: [{ nodes: deepCopyNodes(nodes), edges: shallowCopyEdges(edges) }, ...future.slice(0, 49)],
    })
  },

  redo: () => {
    const { history, future, nodes, edges } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      nodes: deepCopyNodes(next.nodes),
      edges: shallowCopyEdges(next.edges),
      history: [...history.slice(-49), { nodes: deepCopyNodes(nodes), edges: shallowCopyEdges(edges) }],
      future: future.slice(1),
    })
  },

  addTextNode: (flowPosition) => {
    get()._pushHistory()
    nodeCounter++
    const id = `text-${nodeCounter}`
    const newNode: TextNode = {
      id,
      type: 'textNode',
      position: flowPosition,
      data: { text: '' },
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  addFrameNode: (flowPosition, width, height) => {
    get()._pushHistory()
    nodeCounter++
    const id = `frame-${nodeCounter}`
    const newNode: FrameNode = {
      id,
      type: 'frameNode',
      position: flowPosition,
      data: { label: 'Área' },
      style: { width: width ?? 400, height: height ?? 300 },
      zIndex: -1,
    }
    // Frames vão no início do array para ficarem atrás dos outros nós na renderização
    set((state) => ({ nodes: [newNode, ...state.nodes] }))
    return id
  },

  setTextNodeContent: (nodeId, text) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? ({ ...n, data: { ...n.data, text } } as FactoryNode) : n
      ),
    }))
  },

  setFrameNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? ({ ...n, data: { ...n.data, label } } as FactoryNode) : n
      ),
    }))
  },

  setFrameNodeLocked: (nodeId, locked) => {
    get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? ({ ...n, data: { ...n.data, locked } } as FactoryNode) : n
      ),
    }))
  },

  copyNodes: () => {
    const { nodes, edges } = get()
    const selected = nodes.filter(n => n.selected)
    if (selected.length === 0) return

    // Frames travados selecionados puxam automaticamente os nós dentro deles
    const extraIds = new Set<string>()
    for (const node of selected) {
      if (node.type !== 'frameNode') continue
      const frameData = node.data as import('@/lib/types/store').FrameNodeData
      if (!frameData.locked) continue
      const fw = (node.style?.width as number | undefined) ?? 400
      const fh = (node.style?.height as number | undefined) ?? 300
      for (const other of nodes) {
        if (other.id === node.id) continue
        if (
          other.position.x >= node.position.x &&
          other.position.y >= node.position.y &&
          other.position.x <= node.position.x + fw &&
          other.position.y <= node.position.y + fh
        ) {
          extraIds.add(other.id)
        }
      }
    }

    const toCopy = extraIds.size > 0
      ? [...selected, ...nodes.filter(n => extraIds.has(n.id) && !selected.some(s => s.id === n.id))]
      : selected

    const selectedIds = new Set(toCopy.map(n => n.id))
    const internalEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))

    const xs = toCopy.map(n => n.position.x)
    const ys = toCopy.map(n => n.position.y)
    const centroid = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }

    set({ clipboard: { nodes: deepCopyNodes(toCopy), edges: shallowCopyEdges(internalEdges), centroid } })
  },

  startPaste: () => {
    const { clipboard } = get()
    if (!clipboard || clipboard.nodes.length === 0) return
    set({ isGhostActive: true })
  },

  commitPaste: (flowPosition) => {
    const { clipboard, nodes, edges } = get()
    if (!clipboard) return

    get()._pushHistory()

    const idMap = new Map<string, string>()
    const offset = {
      x: flowPosition.x - clipboard.centroid.x,
      y: flowPosition.y - clipboard.centroid.y,
    }

    const newNodes = clipboard.nodes.map(n => {
      nodeCounter++
      const prefix =
        n.type === 'splitterNode' ? 'splitter' :
        n.type === 'mergerNode'   ? 'merger'   :
        n.type === 'textNode'     ? 'text'     :
        n.type === 'frameNode'    ? 'frame'    : 'machine'
      const newId = `${prefix}-${nodeCounter}`
      idMap.set(n.id, newId)
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        selected: true,
        data: {
          ...n.data,
          incomingSupply: undefined,
          outgoingDemand: undefined,
        },
      } as FactoryNode
    })

    const newEdges = clipboard.edges.map(e => ({
      ...e,
      id: `e-${idMap.get(e.source)}-${idMap.get(e.target)}-${e.sourceHandle}-${e.targetHandle}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }))

    // Frames colados ficam no início para renderizar atrás dos filhos
    const newFrames = newNodes.filter(n => n.type === 'frameNode')
    const newOthers = newNodes.filter(n => n.type !== 'frameNode')

    set({
      nodes: [...newFrames, ...nodes.map(n => ({ ...n, selected: false })), ...newOthers],
      edges: [...edges, ...newEdges],
      isGhostActive: false,
      // Mantém o clipboard intacto para permitir colagens repetidas (Ctrl+V múltiplas vezes)
    })
  },

  // Cancela sem limpar o clipboard — permite tentar colar novamente após Escape
  cancelPaste: () => {
    set({ isGhostActive: false })
  },

  setGhostPosition: (flowPos, screenPos) => {
    set({ ghostPosition: flowPos, ghostScreenPosition: screenPos })
  },
}))
