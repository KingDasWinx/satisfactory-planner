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
import type { MachineNodeData, MachineNode, SplitterNode, MergerNode, StorageNode, TextNode, FrameNode, FactoryNode, MenuContext, ClipboardData, HistoryEntry } from '@/lib/types/store'
import { constrainDraggedNodesLive, settleNodesNoOverlap } from '@/lib/utils/nodeRepulsion'
import { showMagicPlannerInContextMenu } from '@/lib/utils/magicPlannerVisibility'
import { estimateNodeSize } from '@/lib/utils/nodeGeometry'
import { getAlignmentSnap, getSpacingGuides } from '@/lib/utils/alignmentGuides'
import type { HelperLinesState } from '@/lib/types/helperLines'

export type { MachineNodeData, MachineNode, SplitterNode, MergerNode, StorageNode, TextNode, FrameNode, FactoryNode, MenuContext }

const COMPUTED_KEYS = new Set<keyof MachineNodeData>([
  'incomingSupply',
  'outgoingDemand',
  'incomingPotential',
  'effectiveRates',
  'efficiency',
  'autoNMachines',
  'magicAutoApplied',
  'createdByMagic',
])

type FactoryStore = {
  nodes: FactoryNode[]
  edges: Edge[]
  menu: MenuContext | null
  helperLines: HelperLinesState | null

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

  clearHelperLines: () => void

  runMagicPlanner: (nodeId: string, position: { x: number; y: number }) => void
  applyMagicPlanner: (args: {
    targetNodeId: string
    recipes: ParsedRecipe[]
    machines: Machine[]
    chosenByPart: Record<string, ParsedRecipe>
  }) => void

  addRecipeNode: (recipe: ParsedRecipe, machine: Machine, flowPosition: XYPosition) => string
  addSplitterNode: (flowPosition: XYPosition) => string
  addMergerNode: (flowPosition: XYPosition) => string
  setRecipe: (nodeId: string, recipe: ParsedRecipe) => void
  setNodeConfig: (nodeId: string, config: Partial<Pick<MachineNodeData,
    | 'nMachines'
    | 'clockSpeed'
    | 'autoNMachines'
    | 'autoLocked'
    | 'minerVariant'
    | 'minerCapacity'
    | 'outputRateOverride'
    | 'incomingSupply'
    | 'outgoingDemand'
    | 'incomingPotential'
    | 'effectiveRates'
    | 'efficiency'
  >> & {
    incomingRatesByPart?: Record<string, number>
    // internal flags (not stored on node.data)
    __fromAuto?: boolean
    __unlockAuto?: boolean
  }) => void

  addStorageNode: (flowPosition: XYPosition) => string
  addTextNode: (flowPosition: XYPosition) => string
  addFrameNode: (flowPosition: XYPosition, width?: number, height?: number) => string
  setTextNodeContent: (nodeId: string, text: string) => void
  setTextNodeStyle: (nodeId: string, stylePartial: Partial<Omit<TextNode['data'], 'text'>>) => void
  resetTextNodeStyle: (nodeId: string) => void
  setFrameNodeLabel: (nodeId: string, label: string) => void
  setFrameNodeLocked: (nodeId: string, locked: boolean) => void

  copyNodes: () => void
  copyNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  startPaste: () => void
  commitPaste: (flowPosition: XYPosition) => void
  cancelPaste: () => void
  undo: () => void
  redo: () => void
  setGhostPosition: (flowPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void

  _pushHistory: () => void
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

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
  helperLines: null,
  history: [],
  future: [],
  clipboard: null,
  isGhostActive: false,
  ghostPosition: { x: 0, y: 0 },
  ghostScreenPosition: { x: 0, y: 0 },

  onNodesChange: (changes) => {
    // Push history UMA VEZ por batch (não por change individual) para evitar
    // múltiplos estados quando vários nós são movidos/deletados juntos
    const hasPositionEnd = changes.some((c) => c.type === 'position' && (c as { dragging?: boolean }).dragging === false)
    const hasRemove = changes.some(c => c.type === 'remove')
    // 'dimensions' é emitido pelo NodeResizer ao terminar o resize.
    // Use check estrito para não tratar `undefined` como "fim" (evita pushHistory em excesso).
    const hasDimensionsEnd = changes.some(c => c.type === 'dimensions' && (c as { resizing?: boolean }).resizing === false)
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

    set((state) => {
      const applied = applyNodeChanges([...changes, ...extraChanges], state.nodes) as FactoryNode[]

      // Persist explicit dimensions for textNode: xyflow emits `dimensions` changes
      // but we want width/height to survive reload/undo via node.style.
      const dimensionChanges = changes.filter(
        (c): c is Extract<typeof c, { type: 'dimensions' }> => c.type === 'dimensions'
      )
      const appliedWithTextDimensions = dimensionChanges.length === 0
        ? applied
        : applied.map((n) => {
          if (n.type !== 'textNode') return n
          const change = dimensionChanges.find((c) => c.id === n.id) as unknown as {
            id: string
            dimensions?: { width?: number; height?: number }
            width?: number
            height?: number
          } | undefined
          if (!change) return n
          const width = change.dimensions?.width ?? change.width
          const height = change.dimensions?.height ?? change.height
          if (typeof width !== 'number' || typeof height !== 'number') return n
          return {
            ...n,
            style: {
              ...(n.style ?? {}),
              width,
              height,
            },
          } as FactoryNode
        })

      const isDragging = changes.some((c) => c.type === 'position' && (c as { dragging?: boolean }).dragging !== false)
      if (isDragging) {
        const draggedIds = new Set<string>()
        for (const c of changes) {
          if (c.type === 'position' && (c as { dragging?: boolean }).dragging !== false) draggedIds.add(c.id)
        }
        for (const c of extraChanges) {
          if (c.type === 'position' && (c as { dragging?: boolean }).dragging !== false) draggedIds.add(c.id)
        }

        const excludeTypes = new Set<FactoryNode['type']>(['frameNode'])
        const guides: HelperLinesState['guides'] = []
        const spacing: HelperLinesState['spacing'] = []

        // Apply snap-to-guides on drag (Figma-like)
        const snapped = appliedWithTextDimensions.map((n) => {
          if (!draggedIds.has(n.id)) return n
          if (excludeTypes.has(n.type)) return n

          const align = getAlignmentSnap({ draggedId: n.id, nodes: applied, alignThreshold: 6, excludeTypes })
          const space = getSpacingGuides({ draggedId: n.id, nodes: applied, spacingThreshold: 8, sameLineOverlapRatio: 0.3, excludeTypes })

          const nextPos = { ...n.position }
          // Apply alignment snap first
          if (align?.vertical) nextPos.x = align.snapPosition.x
          if (align?.horizontal) nextPos.y = align.snapPosition.y
          // Apply spacing snap after (composition)
          if (space) {
            // space.snapPosition contains the recommended axis snaps; combine both axes
            nextPos.x = space.snapPosition.x
            nextPos.y = space.snapPosition.y
          }
          if (align?.vertical) guides.push(align.vertical)
          if (align?.horizontal) guides.push(align.horizontal)
          if (space) spacing.push(...space.guides, ...space.referenceGuides)

          return ({ ...n, position: nextPos } as FactoryNode)
        })

        const result = constrainDraggedNodesLive(snapped, draggedIds)
        return {
          nodes: result,
          helperLines: {
            draggedIds: [...draggedIds],
            snapPositionById: {},
            guides,
            spacing,
          },
        }
      }

      // On drag end, do not move other nodes. Only clamp the node(s) that just stopped dragging.
      if (hasPositionEnd) {
        const endedIds = new Set<string>()
        for (const c of changes) {
          if (c.type !== 'position') continue
          const dragging = (c as { dragging?: boolean }).dragging
          if (dragging === false) endedIds.add(c.id)
        }
        if (endedIds.size > 0) {
          const beforeById = new Map(appliedWithTextDimensions.map((n) => [n.id, n.position] as const))
          const after = constrainDraggedNodesLive(appliedWithTextDimensions, endedIds)
          for (const id of endedIds) {
            const before = beforeById.get(id)
            const afterPos = after.find((n) => n.id === id)?.position
            if (!before || !afterPos) continue
            const dx = afterPos.x - before.x
            const dy = afterPos.y - before.y
            if (dx !== 0 || dy !== 0) {
              // eslint-disable-next-line no-console
              console.log('[dragEndClamp]', { id, dx, dy, before, after: afterPos })
            }
          }
          return { nodes: after, helperLines: null }
        }
        return {
          nodes: appliedWithTextDimensions,
          helperLines: null,
        }
      }

      // Dimensions end is emitted by NodeResizer (frames). Frames are exempt; keep as-is.
      if (hasDimensionsEnd) {
        return { nodes: appliedWithTextDimensions }
      }

      return { nodes: appliedWithTextDimensions }
    })
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
  clearHelperLines: () => set({ helperLines: null }),

  runMagicPlanner: (nodeId, position) => {
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node || !showMagicPlannerInContextMenu(node)) return
    set({ menu: { type: 'magicWizard', nodeId, position } })
  },

  applyMagicPlanner: ({ targetNodeId, recipes, machines, chosenByPart }) => {
    const { nodes, edges } = get()
    const target = nodes.find((n) => n.id === targetNodeId)
    if (!target || target.type !== 'machineNode') return
    const targetRecipe = target.data.recipe
    if (!targetRecipe) return

    const producersByPart = new Map<string, ParsedRecipe[]>()
    for (const r of recipes) {
      for (const o of r.outputs) {
        const arr = producersByPart.get(o.part) ?? []
        arr.push(r)
        producersByPart.set(o.part, arr)
      }
    }

    const machineMap = new Map(machines.map((m) => [m.name, m]))
    function resolveMachine(recipeMachineName: string): Machine | undefined {
      return machineMap.get(recipeMachineName) ?? machines.find((m) => m.name.startsWith(recipeMachineName))
    }

    function ppmForOut(recipe: ParsedRecipe, part: string): number {
      const out = recipe.outputs.find((o) => o.part === part)
      if (!out) return 0
      const base = (out.amount / recipe.batchTime) * 60
      // Raw resource recipes for miners are stored as 1 part per 60s, but in-game
      // the miner base throughput is 60/min on a normal node at 100%.
      if (recipe.machine === 'Miner' && recipe.batchTime === 60 && out.amount === 1) return 60
      return base
    }

    function ppmForIn(recipe: ParsedRecipe, part: string): number {
      const ing = recipe.inputs.find((i) => i.part === part)
      if (!ing) return 0
      return (ing.amount / recipe.batchTime) * 60
    }

    function isRawMinerRecipe(recipe: ParsedRecipe, part: string): boolean {
      const out = recipe.outputs.find((o) => o.part === part)
      return recipe.machine === 'Miner' && recipe.batchTime === 60 && (out?.amount ?? 0) === 1
    }

    // Layout: zig-zag positions per depth + collision avoidance (variable node heights).
    const depthCounters = new Map<number, number>()
    function zigzag(i: number): number {
      if (i === 0) return 0
      const k = Math.ceil(i / 2)
      return i % 2 === 1 ? k : -k
    }
    const ROOT_X = target.position.x
    const ROOT_Y = target.position.y
    const COL_GAP = 420
    const ROW_GAP = 140

    type PlacedRect = { xKey: number; y: number; h: number }
    const placedByX = new Map<number, PlacedRect[]>()
    function xKeyFor(x: number): number {
      // snap to grid-ish keys to group nodes that share a column
      return Math.round(x / 20) * 20
    }
    function overlaps(y: number, h: number, otherY: number, otherH: number): boolean {
      const top = y - h / 2
      const bot = y + h / 2
      const oTop = otherY - otherH / 2
      const oBot = otherY + otherH / 2
      return top < oBot && bot > oTop
    }
    function placeAvoidingOverlap(pos: { x: number; y: number }, h: number): { x: number; y: number } {
      const key = xKeyFor(pos.x)
      const list = placedByX.get(key) ?? []
      let y = pos.y
      let safety = 0
      while (safety < 200) {
        safety++
        const hit = list.find(r => overlaps(y, h, r.y, r.h))
        if (!hit) break
        // push down below the collided rect with a small gap
        y = hit.y + hit.h / 2 + h / 2 + 24
      }
      list.push({ xKey: key, y, h })
      placedByX.set(key, list)
      return { x: pos.x, y }
    }
    function estimateMachineHeight(recipe: ParsedRecipe): number {
      // Align with lib/utils/nodeGeometry.ts, but pessimistic about dynamic sections:
      // - Utilização may appear when there are inputs (once incomingSupply exists)
      // - Sobra may appear when there are outputs (once outgoingDemand exists)
      const base = estimateNodeSize({
        id: 'tmp',
        type: 'machineNode',
        position: { x: 0, y: 0 },
        data: {
          machine: { name: 'tmp', averagePower: 0 } as unknown as Machine,
          recipe,
          availableRecipes: [recipe],
          nMachines: 1,
          clockSpeed: 1,
          // incomingSupply/outgoingDemand intentionally omitted (unknown at layout time)
        },
      } as MachineNode).h

      const UTIL_BAR_H = 32
      const LEFTOVER_BLOCK_H = 24
      const hasInputs = (recipe.inputs?.length ?? 0) > 0
      const hasOutputs = (recipe.outputs?.length ?? 0) > 0

      return base + (hasInputs ? UTIL_BAR_H : 0) + (hasOutputs ? LEFTOVER_BLOCK_H : 0)
    }
    function estimateSmallNodeHeight(): number {
      // Use the same estimator as collision system (deterministic).
      return estimateNodeSize({
        id: 'tmp',
        type: 'splitterNode',
        position: { x: 0, y: 0 },
        data: {},
      } as SplitterNode).h
    }

    function nextPos(depth: number): { x: number; y: number } {
      const idx = depthCounters.get(depth) ?? 0
      depthCounters.set(depth, idx + 1)
      const pos = {
        x: ROOT_X - (depth + 1) * COL_GAP,
        y: ROOT_Y + zigzag(idx) * ROW_GAP,
      }
      // Machine heights vary; we adjust later per-node with placeAvoidingOverlap.
      return pos
    }

    const newNodes: FactoryNode[] = []
    const newEdges: Edge[] = []

    type ConsumerEndpoint = {
      nodeId: string
      targetHandle: string
      pos: { x: number; y: number }
      requiredPerMin: number
    }

    // Global routing structures (per part)
    type PartDemand = {
      part: string
      totalRequired: number
      consumers: ConsumerEndpoint[]
      depth: number
    }
    const demandsByPart = new Map<string, PartDemand>()
    const resolvedParts = new Set<string>()

    type ProducerEndpoint = { nodeId: string; outHandle: string; pos: { x: number; y: number } }
    const supplyTrunkByPart = new Map<string, ProducerEndpoint>()

    function connectManyToOne(
      sources: { nodeId: string; outHandle: string; pos: { x: number; y: number } }[],
      targetNodeId: string,
      targetHandle: string,
      targetPos: { x: number; y: number },
      depth: number,
    ) {
      if (sources.length === 0) return
      if (sources.length === 1) {
        const s = sources[0]!
        newEdges.push({
          id: `e-${s.nodeId}-${targetNodeId}-${s.outHandle}-${targetHandle}`,
          source: s.nodeId,
          sourceHandle: s.outHandle,
          target: targetNodeId,
          targetHandle,
          animated: true,
        })
        return
      }

      // Build a chain of mergers, each with up to 3 inputs.
      let levelSources = sources
      let level = 0
      while (levelSources.length > 1) {
        const nextLevel: { nodeId: string; outHandle: string; pos: { x: number; y: number } }[] = []
        for (let i = 0; i < levelSources.length; i += 3) {
          const chunk = levelSources.slice(i, i + 3)
          if (chunk.length === 1) {
            nextLevel.push(chunk[0]!)
            continue
          }
          const mergerId = uid('merger')
          const avgY = chunk.reduce((s, c) => s + c.pos.y, 0) / chunk.length
          const rawPos = { x: targetPos.x - 200 - level * 220, y: avgY }
          const pos = placeAvoidingOverlap(rawPos, estimateSmallNodeHeight())
          newNodes.push({ id: mergerId, type: 'mergerNode', position: pos, data: {} } as MergerNode)
          chunk.forEach((c, idx) => {
            newEdges.push({
              id: `e-${c.nodeId}-${mergerId}-${c.outHandle}-in-${idx}`,
              source: c.nodeId,
              sourceHandle: c.outHandle,
              target: mergerId,
              targetHandle: `in-${idx}`,
              animated: true,
            })
          })
          nextLevel.push({ nodeId: mergerId, outHandle: 'out-0', pos })
        }
        levelSources = nextLevel
        level++
        // Safety: stop pathological loops.
        if (level > 20) break
      }

      const final = levelSources[0]
      if (!final) return
      newEdges.push({
        id: `e-${final.nodeId}-${targetNodeId}-${final.outHandle}-${targetHandle}`,
        source: final.nodeId,
        sourceHandle: final.outHandle,
        target: targetNodeId,
        targetHandle,
        animated: true,
      })
    }

    function mergeSources(
      sources: { nodeId: string; outHandle: string; pos: { x: number; y: number } }[],
      nearPos: { x: number; y: number },
    ): { nodeId: string; outHandle: string; pos: { x: number; y: number } } {
      if (sources.length === 1) return sources[0]!

      let levelSources = sources
      let level = 0
      while (levelSources.length > 1) {
        const nextLevel: { nodeId: string; outHandle: string; pos: { x: number; y: number } }[] = []
        for (let i = 0; i < levelSources.length; i += 3) {
          const chunk = levelSources.slice(i, i + 3)
          if (chunk.length === 1) {
            nextLevel.push(chunk[0]!)
            continue
          }
          const mergerId = uid('merger')
          const avgY = chunk.reduce((s, c) => s + c.pos.y, 0) / chunk.length
          const rawPos = { x: nearPos.x + 240 + level * 220, y: avgY }
          const pos = placeAvoidingOverlap(rawPos, estimateSmallNodeHeight())
          newNodes.push({ id: mergerId, type: 'mergerNode', position: pos, data: {} } as MergerNode)
          chunk.forEach((c, idx) => {
            newEdges.push({
              id: `e-${c.nodeId}-${mergerId}-${c.outHandle}-in-${idx}`,
              source: c.nodeId,
              sourceHandle: c.outHandle,
              target: mergerId,
              targetHandle: `in-${idx}`,
              animated: true,
            })
          })
          nextLevel.push({ nodeId: mergerId, outHandle: 'out-0', pos })
        }
        levelSources = nextLevel
        level++
        if (level > 20) break
      }
      return levelSources[0]!
    }

    function connectOneToMany(
      source: { nodeId: string; outHandle: string; pos: { x: number; y: number } },
      targets: ConsumerEndpoint[],
      depth: number,
    ) {
      if (targets.length === 0) return
      if (targets.length === 1) {
        const t = targets[0]!
        newEdges.push({
          id: `e-${source.nodeId}-${t.nodeId}-${source.outHandle}-${t.targetHandle}`,
          source: source.nodeId,
          sourceHandle: source.outHandle,
          target: t.nodeId,
          targetHandle: t.targetHandle,
          animated: true,
        })
        return
      }

      // Root splitter between source and average target Y.
      const avgY = targets.reduce((s, t) => s + t.pos.y, 0) / targets.length
      const rootId = uid('splitter')
      const rawRootPos = { x: source.pos.x + 200, y: avgY }
      const rootPos = placeAvoidingOverlap(rawRootPos, estimateSmallNodeHeight())
      newNodes.push({ id: rootId, type: 'splitterNode', position: rootPos, data: {} } as SplitterNode)
      newEdges.push({
        id: `e-${source.nodeId}-${rootId}-${source.outHandle}-in-0`,
        source: source.nodeId,
        sourceHandle: source.outHandle,
        target: rootId,
        targetHandle: 'in-0',
        animated: true,
      })

      type Port = { nodeId: string; outHandle: string; pos: { x: number; y: number } }
      const ports: Port[] = [
        { nodeId: rootId, outHandle: 'out-0', pos: rootPos },
        { nodeId: rootId, outHandle: 'out-1', pos: rootPos },
        { nodeId: rootId, outHandle: 'out-2', pos: rootPos },
      ]

      let safety = 0
      while (ports.length < targets.length && safety < 200) {
        safety++
        const port = ports.shift()
        if (!port) break
        const splitId = uid('splitter')
        const rawSplitPos = { x: port.pos.x + 200, y: port.pos.y }
        const splitPos = placeAvoidingOverlap(rawSplitPos, estimateSmallNodeHeight())
        newNodes.push({ id: splitId, type: 'splitterNode', position: splitPos, data: {} } as SplitterNode)
        newEdges.push({
          id: `e-${port.nodeId}-${splitId}-${port.outHandle}-in-0`,
          source: port.nodeId,
          sourceHandle: port.outHandle,
          target: splitId,
          targetHandle: 'in-0',
          animated: true,
        })
        ports.push(
          { nodeId: splitId, outHandle: 'out-0', pos: splitPos },
          { nodeId: splitId, outHandle: 'out-1', pos: splitPos },
          { nodeId: splitId, outHandle: 'out-2', pos: splitPos },
        )
      }

      targets.forEach((t, i) => {
        const p = ports[i]
        if (!p) return
        newEdges.push({
          id: `e-${p.nodeId}-${t.nodeId}-${p.outHandle}-${t.targetHandle}`,
          source: p.nodeId,
          sourceHandle: p.outHandle,
          target: t.nodeId,
          targetHandle: t.targetHandle,
          animated: true,
        })
      })
    }

    function addDemand(part: string, consumer: ConsumerEndpoint, depth: number) {
      const existing = demandsByPart.get(part)
      if (!existing) {
        demandsByPart.set(part, { part, totalRequired: consumer.requiredPerMin, consumers: [consumer], depth })
      } else {
        existing.totalRequired += consumer.requiredPerMin
        existing.consumers.push(consumer)
        existing.depth = Math.min(existing.depth, depth)
      }
    }

    // Seed demands from target recipe inputs.
    // Magic always plans for at least 1× of the target machine.
    const targetMachinesForMagic = Math.max(1, target.data.nMachines || 1)
    for (let i = 0; i < targetRecipe.inputs.length; i++) {
      const part = targetRecipe.inputs[i]!.part
      const need = target.data.effectiveRates?.inputs?.[i] ?? target.data.incomingSupply?.[i] ?? 0
      const fallback = (ppmForIn(targetRecipe, part) * targetMachinesForMagic * target.data.clockSpeed)
      const required = need > 0 ? need : fallback
      if (required <= 0) continue
      addDemand(part, { nodeId: target.id, targetHandle: `in-${i}`, pos: target.position, requiredPerMin: required }, 0)
    }

    function ensureSupplyForPart(part: string) {
      if (supplyTrunkByPart.has(part)) return
      const demand = demandsByPart.get(part)
      if (!demand || demand.totalRequired <= 0) return

      const chosen = chosenByPart[part] ?? (producersByPart.get(part)?.[0] ?? null)
      if (!chosen) return

      const machine = resolveMachine(chosen.machine)
      if (!machine) return

      const outPpmPerMachine = ppmForOut(chosen, part)
      if (outPpmPerMachine <= 0) return

      // Create only ONE producer node for this part, adjusting its nMachines.
      // Keep internal consistency: the same value is used for node config and for input demands.
      const desiredMachinesRaw = Math.max(1, demand.totalRequired / outPpmPerMachine)
      const machinesValue = Math.round(desiredMachinesRaw * 100) / 100
      const outIdx = Math.max(0, chosen.outputs.findIndex((o) => o.part === part))

      const avgY = demand.consumers.reduce((s, c) => s + c.pos.y, 0) / demand.consumers.length
      const baseX = ROOT_X - (demand.depth + 1) * COL_GAP

      const id = uid('machine')
      // Use a global slot per column (depth) to avoid overlap across different parts.
      const rawPos = nextPos(demand.depth)
      const pos = placeAvoidingOverlap(rawPos, estimateMachineHeight(chosen))
      newNodes.push({
        id,
        type: 'machineNode',
        position: pos,
        data: {
          machine,
          recipe: chosen,
          availableRecipes: [chosen],
          nMachines: machinesValue,
          clockSpeed: 1,
          createdByMagic: true,
          magicAutoApplied: false,
        },
      } as MachineNode)
      const trunk: ProducerEndpoint = { nodeId: id, outHandle: `out-${outIdx}`, pos }
      supplyTrunkByPart.set(part, trunk)

      // Producer demands for its inputs scale with nMachines.
      for (let inIdx = 0; inIdx < chosen.inputs.length; inIdx++) {
        const inPart = chosen.inputs[inIdx]!.part
        const inNeedPerMachine = ppmForIn(chosen, inPart)
        if (inNeedPerMachine <= 0) continue
        addDemand(
          inPart,
          { nodeId: id, targetHandle: `in-${inIdx}`, pos, requiredPerMin: inNeedPerMachine * machinesValue },
          demand.depth + 1,
        )
      }
    }

    // Resolve parts in BFS-ish manner: keep processing until no new parts appear.
    let safety = 0
    while (safety < 2000) {
      safety++
      const next = [...demandsByPart.keys()].find((p) => !resolvedParts.has(p))
      if (!next) break
      resolvedParts.add(next)
      ensureSupplyForPart(next)
    }

    // Connect trunks to all consumers (splitter cascades).
    for (const [part, demand] of demandsByPart) {
      const trunk = supplyTrunkByPart.get(part)
      if (!trunk) continue
      connectOneToMany(trunk, demand.consumers, demand.depth)
    }

    if (newNodes.length === 0 && newEdges.length === 0) return

    get()._pushHistory()
    const updatedExistingNodes = nodes.map((n) =>
      n.id === targetNodeId && n.type === 'machineNode'
        ? ({ ...n, data: { ...n.data, createdByMagic: true, magicAutoApplied: false } } as FactoryNode)
        : n
    )

    const nextNodes = [...updatedExistingNodes, ...newNodes]
    const settledNodes = settleNodesNoOverlap(nextNodes, { iterations: 60 })

    set({
      nodes: settledNodes,
      edges: [...edges, ...newEdges],
      menu: null,
    })
  },

  addRecipeNode: (recipe, machine, flowPosition) => {
    get()._pushHistory()
    const id = uid('machine')
    const newNode: MachineNode = {
      id,
      type: 'machineNode',
      position: flowPosition,
      data: { machine, recipe, availableRecipes: [recipe], nMachines: 1, clockSpeed: 1 },
    }
    set((state) => {
      const fixedIds = new Set(state.nodes.map((n) => n.id))
      return { nodes: settleNodesNoOverlap([...state.nodes, newNode], { iterations: 30, fixedIds }) }
    })
    return id
  },

  addSplitterNode: (flowPosition) => {
    get()._pushHistory()
    const id = uid('splitter')
    const newNode: SplitterNode = {
      id,
      type: 'splitterNode',
      position: flowPosition,
      data: {},
    }
    set((state) => {
      const fixedIds = new Set(state.nodes.map((n) => n.id))
      return { nodes: settleNodesNoOverlap([...state.nodes, newNode], { iterations: 30, fixedIds }) }
    })
    return id
  },

  addMergerNode: (flowPosition) => {
    get()._pushHistory()
    const id = uid('merger')
    const newNode: MergerNode = {
      id,
      type: 'mergerNode',
      position: flowPosition,
      data: {},
    }
    set((state) => {
      const fixedIds = new Set(state.nodes.map((n) => n.id))
      return { nodes: settleNodesNoOverlap([...state.nodes, newNode], { iterations: 30, fixedIds }) }
    })
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
    const { __fromAuto, __unlockAuto, ...rest } = config as (typeof config & { __fromAuto?: boolean; __unlockAuto?: boolean })

    const manualKeys: (keyof MachineNodeData)[] = ['nMachines', 'clockSpeed', 'outputRateOverride', 'minerVariant', 'minerCapacity']
    const isManualEdit = !__fromAuto && manualKeys.some((k) => Object.prototype.hasOwnProperty.call(rest, k))

    // Só faz push ao histórico se há pelo menos uma chave não-computada na config
    const hasNonComputed = (Object.keys(rest) as (keyof MachineNodeData)[]).some(k => !COMPUTED_KEYS.has(k))
    if (hasNonComputed) get()._pushHistory()

    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        const nextData: Record<string, unknown> = { ...(n.data as Record<string, unknown>), ...(rest as Record<string, unknown>) }
        if (__unlockAuto) nextData.autoLocked = false
        if (isManualEdit) nextData.autoLocked = true
        return { ...n, data: nextData } as FactoryNode
      }),
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

  addStorageNode: (flowPosition) => {
    get()._pushHistory()
    const id = uid('storage')
    const newNode: StorageNode = {
      id,
      type: 'storageNode',
      position: flowPosition,
      data: {},
    }
    set((state) => {
      const fixedIds = new Set(state.nodes.map((n) => n.id))
      return { nodes: settleNodesNoOverlap([...state.nodes, newNode], { iterations: 30, fixedIds }) }
    })
    return id
  },

  addTextNode: (flowPosition) => {
    get()._pushHistory()
    const id = uid('text')
    const newNode: TextNode = {
      id,
      type: 'textNode',
      position: flowPosition,
      data: { text: '' },
    }
    set((state) => {
      const fixedIds = new Set(state.nodes.map((n) => n.id))
      return { nodes: settleNodesNoOverlap([...state.nodes, newNode], { iterations: 30, fixedIds }) }
    })
    return id
  },

  addFrameNode: (flowPosition, width, height) => {
    get()._pushHistory()
    const id = uid('frame')
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

  setTextNodeStyle: (nodeId, stylePartial) => {
    const { nodes } = get()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type !== 'textNode') return

    get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        if (n.type !== 'textNode') return n
        const nextStyle =
          stylePartial.autoSizeHeight === true
            ? { ...(n.style ?? {}), height: undefined }
            : n.style
        return ({ ...n, style: nextStyle, data: { ...n.data, ...stylePartial } } as FactoryNode)
      }),
    }))
  },

  resetTextNodeStyle: (nodeId) => {
    const { nodes } = get()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type !== 'textNode') return

    get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n
        if (n.type !== 'textNode') return n

        const { text } = n.data as TextNode['data']
        return ({
          ...n,
          data: { text },
        } as FactoryNode)
      }),
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

    const minX = Math.min(...toCopy.map((n) => n.position.x))
    const minY = Math.min(...toCopy.map((n) => n.position.y))
    const maxX = Math.max(...toCopy.map((n) => n.position.x + estimateNodeSize(n).w))
    const maxY = Math.max(...toCopy.map((n) => n.position.y + estimateNodeSize(n).h))
    const centroid = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

    set({ clipboard: { nodes: deepCopyNodes(toCopy), edges: shallowCopyEdges(internalEdges), centroid } })
  },

  copyNode: (nodeId) => {
    const { nodes, edges } = get()
    const root = nodes.find((n) => n.id === nodeId)
    if (!root) return

    const toCopy: FactoryNode[] = [root]

    // Mesmo comportamento do Ctrl+C: frame travado inclui nós contidos.
    if (root.type === 'frameNode') {
      const frameData = root.data as import('@/lib/types/store').FrameNodeData
      if (frameData.locked) {
        const fw = (root.style?.width as number | undefined) ?? 400
        const fh = (root.style?.height as number | undefined) ?? 300
        for (const other of nodes) {
          if (other.id === root.id) continue
          if (
            other.position.x >= root.position.x &&
            other.position.y >= root.position.y &&
            other.position.x <= root.position.x + fw &&
            other.position.y <= root.position.y + fh
          ) {
            toCopy.push(other)
          }
        }
      }
    }

    const selectedIds = new Set(toCopy.map((n) => n.id))
    const internalEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))

    const minX = Math.min(...toCopy.map((n) => n.position.x))
    const minY = Math.min(...toCopy.map((n) => n.position.y))
    const maxX = Math.max(...toCopy.map((n) => n.position.x + estimateNodeSize(n).w))
    const maxY = Math.max(...toCopy.map((n) => n.position.y + estimateNodeSize(n).h))
    const centroid = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

    set({ clipboard: { nodes: deepCopyNodes(toCopy), edges: shallowCopyEdges(internalEdges), centroid } })
  },

  deleteNode: (nodeId) => {
    const { nodes } = get()
    if (!nodes.some((n) => n.id === nodeId)) return

    get()._pushHistory()
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }))
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
      const prefix =
        n.type === 'splitterNode' ? 'splitter' :
        n.type === 'mergerNode'   ? 'merger'   :
        n.type === 'textNode'     ? 'text'     :
        n.type === 'frameNode'    ? 'frame'    : 'machine'
      const newId = uid(prefix)
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

    const nextNodes = [...newFrames, ...nodes.map(n => ({ ...n, selected: false })), ...newOthers]
    const settledNodes = settleNodesNoOverlap(nextNodes, { iterations: 40 })

    set({
      nodes: settledNodes,
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
