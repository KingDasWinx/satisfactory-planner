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
  isDirty: boolean

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

  rescaleUpstream: (nodeId: string, newN: number) => void
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
  markSaved: () => void

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
  isDirty: false,
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

    const ROOT_X = target.position.x
    const ROOT_Y = target.position.y
    const COL_GAP   = 560  // horizontal distance between production columns
    const NODE_W    = 260  // machine node approximate width  (min-w-[240px] + typical content)
    const SMALL_W   = 176  // splitter / merger width         (w-44 = 176px)
    const EDGE_GAP  = 28   // minimum gap between node edges
    const MACHINE_H = 220  // estimated height of a machine node (for Y-gap calc)
    const SMALL_H   = 136  // estimated height of splitter / merger (h-9 header + 3×h-8 rows = 132px)
    const NODE_GAP  = 32   // minimum vertical gap between nodes in the same column

    // colPos: place machine node at column col (1 = adjacent to target, 2 = one further, …).
    // Nodes in the same column are stacked top-to-bottom; Y is later corrected by settleY.
    const colCounters = new Map<number, number>()
    function colPos(col: number): { x: number; y: number } {
      const idx = colCounters.get(col) ?? 0
      colCounters.set(col, idx + 1)
      return {
        x: ROOT_X - col * COL_GAP,
        y: ROOT_Y + idx * (MACHINE_H + NODE_GAP),
      }
    }

    // simplePos: lightweight placement for splitters / mergers (Y settled later).
    function simplePos(x: number, y: number): { x: number; y: number } {
      return { x, y }
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
          const pos = simplePos(targetPos.x - SMALL_W - EDGE_GAP - level * (SMALL_W + EDGE_GAP), avgY)
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
          const pos = simplePos(nearPos.x + NODE_W + EDGE_GAP + level * (SMALL_W + EDGE_GAP), avgY)
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

      // Root splitter: place just after the source node's right edge (NODE_W + EDGE_GAP).
      // Using a fraction of COL_GAP would place the splitter INSIDE the source node because
      // positions are top-left corners and machine nodes are ~260 px wide.
      const avgY = targets.reduce((s, t) => s + t.pos.y, 0) / targets.length
      const splitterX = source.pos.x + NODE_W + EDGE_GAP
      const rootId = uid('splitter')
      const rootPos = simplePos(splitterX, avgY)
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
        const splitPos = simplePos(port.pos.x + SMALL_W + EDGE_GAP, port.pos.y)
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

    // Magic always plans for at least 1× of the target machine.
    let targetMachinesForMagic = Math.max(1, target.data.nMachines || 1)
    const targetClockSpeed = target.data.clockSpeed ?? 1

    // Phase 1: walk the full demand tree BEFORE creating any node, accumulating
    // totalRequired for each intermediate part. This avoids the ordering bug where
    // Iron Rod was processed with demand=20, sized at 1.33× Constructor, then Screw
    // added 25 more iron-rod demand — but Iron Rod was already "resolved" and never
    // resized. With this walk, Iron Rod correctly accumulates 20+25=45 before any
    // node is created, so the Constructor gets the right 3× size.
    //
    // On first visit: walk all inputs with the full machines-equivalent demand.
    // On re-visits: propagate only the delta upstream (avoids double-counting).
    const phase1Required = new Map<string, number>()
    const phase1Visited = new Set<string>()

    function walkPhase1(part: string, neededPerMin: number) {
      const prevTotal = phase1Required.get(part) ?? 0
      phase1Required.set(part, prevTotal + neededPerMin)

      const chosen = chosenByPart[part] ?? (producersByPart.get(part)?.[0] ?? null)
      if (!chosen) return

      const outPpm = ppmForOut(chosen, part)
      if (outPpm <= 0) return

      if (phase1Visited.has(part)) {
        // Already walked: propagate only the delta to avoid double-counting.
        const deltaEq = neededPerMin / outPpm
        for (const inp of chosen.inputs) {
          const inNeeded = deltaEq * ppmForIn(chosen, inp.part)
          if (inNeeded > 0) walkPhase1(inp.part, inNeeded)
        }
      } else {
        phase1Visited.add(part)
        const machinesEq = (prevTotal + neededPerMin) / outPpm
        for (const inp of chosen.inputs) {
          const inNeeded = machinesEq * ppmForIn(chosen, inp.part)
          if (inNeeded > 0) walkPhase1(inp.part, inNeeded)
        }
      }
    }

    function runPhase1(t: number) {
      phase1Required.clear()
      phase1Visited.clear()
      for (const inp of targetRecipe.inputs) {
        const needed = ppmForIn(targetRecipe, inp.part) * t * targetClockSpeed
        if (needed > 0) walkPhase1(inp.part, needed)
      }
    }

    runPhase1(targetMachinesForMagic)

    // Auto-scale the target: some raw-resource machines (e.g. Miners) need less than 1×
    // for the user's requested target count, so they get floored to 1×. This creates
    // excess capacity — the target machine could run at a higher count and still be fully
    // supplied by exactly 1× of each floored machine.
    //
    // Formula: minRaw = min(phase1Required[part] / outPpm) for all parts that would be
    // floored (raw < 1). Scaling target by 1/minRaw makes the most-constrained floored
    // machine land exactly at 1×, eliminating ALL flooring in one step (proof: every
    // other floored part has raw > minRaw, so after scaling its raw exceeds 1 too).
    let minRaw = Infinity
    for (const [part, required] of phase1Required) {
      const chosen = chosenByPart[part] ?? (producersByPart.get(part)?.[0] ?? null)
      if (!chosen) continue
      const outPpm = ppmForOut(chosen, part)
      if (outPpm <= 0) continue
      const raw = required / outPpm
      if (raw > 0 && raw < 1) minRaw = Math.min(minRaw, raw)
    }

    if (minRaw < 1) {
      targetMachinesForMagic = Math.round((targetMachinesForMagic / minRaw) * 100) / 100
      runPhase1(targetMachinesForMagic)
    }

    // Critical-column assignment (ASAP scheduling / longest path to target).
    //
    // BFS depth gives the SHORTEST path, which causes a machine that feeds two consumers
    // (e.g. Iron Rod Constructor feeds Assembler directly AND via Screw Constructor) to end
    // up in the same column as the closer consumer. With longest-path we place it to the
    // left of ALL its consumers, so no edge ever goes right-to-left.
    //
    //  Example — Rotor chain:
    //    BFS depth: IronRodCtor=1, ScrewCtor=1 → same column  (wrong: IronRod feeds ScrewCtor)
    //    Longest path: IronRodCtor=2, ScrewCtor=1              (correct: IronRodCtor is upstream)
    const partConsumers = new Map<string, Set<string>>()
    for (const part of phase1Required.keys()) {
      const chosen = chosenByPart[part] ?? (producersByPart.get(part)?.[0] ?? null)
      if (!chosen) continue
      for (const inp of chosen.inputs) {
        if (!phase1Required.has(inp.part)) continue
        const s = partConsumers.get(inp.part) ?? new Set<string>()
        s.add(part)
        partConsumers.set(inp.part, s)
      }
    }
    for (const inp of targetRecipe.inputs) {
      if (!phase1Required.has(inp.part)) continue
      const s = partConsumers.get(inp.part) ?? new Set<string>()
      s.add('__target__')
      partConsumers.set(inp.part, s)
    }
    const partLayer = new Map<string, number>()
    for (const part of phase1Required.keys()) partLayer.set(part, 1)
    for (let iter = 0; iter < phase1Required.size + 2; iter++) {
      let changed = false
      for (const [part] of phase1Required) {
        for (const consumer of (partConsumers.get(part) ?? new Set<string>())) {
          const cl = consumer === '__target__' ? 0 : (partLayer.get(consumer) ?? 0)
          const nl = cl + 1
          if (nl > (partLayer.get(part) ?? 0)) { partLayer.set(part, nl); changed = true }
        }
      }
      if (!changed) break
    }

    // Phase 2: seed consumer endpoints from the target node's inputs, then BFS upward.
    // Producers are sized using phase1Required (correctly accumulated totals from Phase 1).
    for (let i = 0; i < targetRecipe.inputs.length; i++) {
      const part = targetRecipe.inputs[i]!.part
      const required = ppmForIn(targetRecipe, part) * targetMachinesForMagic * targetClockSpeed
      if (required <= 0) continue
      addDemand(part, { nodeId: target.id, targetHandle: `in-${i}`, pos: target.position, requiredPerMin: required }, 0)
    }

    const processedProducers = new Set<string>()
    const bfsQueue: { part: string; depth: number }[] = targetRecipe.inputs.map((inp) => ({
      part: inp.part,
      depth: 0,
    }))

    while (bfsQueue.length > 0) {
      const item = bfsQueue.shift()!
      if (processedProducers.has(item.part)) continue
      processedProducers.add(item.part)

      const totalPpm = phase1Required.get(item.part) ?? 0
      if (totalPpm <= 0) continue

      const chosen = chosenByPart[item.part] ?? (producersByPart.get(item.part)?.[0] ?? null)
      if (!chosen) continue

      const machine = resolveMachine(chosen.machine)
      if (!machine) continue

      const outPpm = ppmForOut(chosen, item.part)
      if (outPpm <= 0) continue

      // Use the correctly accumulated total from Phase 1.
      const machinesValue = Math.round(Math.max(1, totalPpm / outPpm) * 100) / 100
      const outIdx = Math.max(0, chosen.outputs.findIndex((o) => o.part === item.part))

      const id = uid('machine')
      const col = partLayer.get(item.part) ?? 1
      const pos = colPos(col)
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
          autoLocked: true,
        },
      } as MachineNode)

      supplyTrunkByPart.set(item.part, { nodeId: id, outHandle: `out-${outIdx}`, pos })

      for (let inIdx = 0; inIdx < chosen.inputs.length; inIdx++) {
        const inPart = chosen.inputs[inIdx]!.part
        const inNeedPerMachine = ppmForIn(chosen, inPart)
        if (inNeedPerMachine <= 0) continue
        addDemand(
          inPart,
          { nodeId: id, targetHandle: `in-${inIdx}`, pos, requiredPerMin: inNeedPerMachine * machinesValue },
          item.depth + 1,
        )
        bfsQueue.push({ part: inPart, depth: item.depth + 1 })
      }
    }

    // Connect trunks to all consumers (splitter cascades).
    for (const [part, demand] of demandsByPart) {
      const trunk = supplyTrunkByPart.get(part)
      if (!trunk) continue
      connectOneToMany(trunk, demand.consumers, demand.depth)
    }

    // Y-settlement pass: center each column's nodes on the average Y of their
    // right-side neighbors, then enforce minimum vertical gaps within each column.
    // Process right-to-left so each column's position is already settled when
    // used as a reference for the column to its left.
    ;(function settleYPositions() {
      // Outgoing edge map (source → direct targets)
      const toRight = new Map<string, string[]>()
      for (const e of newEdges) {
        const arr = toRight.get(e.source) ?? []
        if (!arr.includes(e.target)) arr.push(e.target)
        toRight.set(e.source, arr)
      }

      // Working position map — includes target as a fixed Y anchor
      const pos = new Map<string, { x: number; y: number }>()
      pos.set(target.id, target.position)
      for (const n of newNodes) pos.set(n.id, { ...n.position })

      const getH = (id: string) => {
        const n = newNodes.find(nn => nn.id === id)
        return n?.type === 'machineNode' ? MACHINE_H : SMALL_H
      }

      // Group nodes by X column (snap to nearest 10 px to merge floating-point twins)
      const byX = new Map<number, string[]>()
      for (const n of newNodes) {
        const x = Math.round(n.position.x / 10) * 10
        const arr = byX.get(x) ?? []
        arr.push(n.id)
        byX.set(x, arr)
      }

      // Right-to-left column processing
      for (const colX of [...byX.keys()].sort((a, b) => b - a)) {
        const ids = byX.get(colX)!

        // Compute ideal Y for each node = average Y of its immediate downstream neighbors
        const entries = ids.map(id => {
          const neighbors = toRight.get(id) ?? []
          const ys = neighbors.map(rid => pos.get(rid)?.y ?? ROOT_Y)
          const idealY = ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : ROOT_Y
          return { id, idealY }
        })

        entries.sort((a, b) => a.idealY - b.idealY)

        // Average ideal Y — used to re-center after gap expansion
        const avgIdeal = entries.reduce((s, e) => s + e.idealY, 0) / entries.length

        // Apply minimum vertical gaps (push nodes apart from top to bottom)
        const ys = entries.map(e => e.idealY)
        for (let i = 1; i < ys.length; i++) {
          const gap = (getH(entries[i - 1]!.id) + getH(entries[i]!.id)) / 2 + NODE_GAP
          if (ys[i]! < ys[i - 1]! + gap) ys[i] = ys[i - 1]! + gap
        }

        // Re-center the column around avgIdeal (gap expansion drifts the cluster downward)
        if (ys.length > 0) {
          const gapCenter = ys.length > 1 ? (ys[0]! + ys[ys.length - 1]!) / 2 : ys[0]!
          const shift = avgIdeal - gapCenter
          for (let i = 0; i < ys.length; i++) ys[i]! && (ys[i] = ys[i]! + shift)
        }

        // Write final Y back
        for (let i = 0; i < entries.length; i++) {
          const n = newNodes.find(nn => nn.id === entries[i]!.id)
          if (n) n.position = { x: n.position.x, y: ys[i]! }
          pos.set(entries[i]!.id, { x: colX, y: ys[i]! })
        }
      }
    })()

    if (newNodes.length === 0 && newEdges.length === 0) return

    get()._pushHistory()
    const updatedExistingNodes = nodes.map((n) =>
      n.id === targetNodeId && n.type === 'machineNode'
        ? ({ ...n, data: { ...n.data, nMachines: targetMachinesForMagic, createdByMagic: true, magicAutoApplied: false, autoLocked: true } } as FactoryNode)
        : n
    )

    const nextNodes = [...updatedExistingNodes, ...newNodes]
    const settledNodes = settleNodesNoOverlap(nextNodes, { iterations: 30 })

    set({
      nodes: settledNodes,
      edges: [...edges, ...newEdges],
      menu: null,
    })
  },

  rescaleUpstream: (nodeId, newN) => {
    const { nodes, edges } = get()
    const target = nodes.find((n) => n.id === nodeId)
    if (!target || target.type !== 'machineNode' || !target.data.recipe) return

    // Step 1: BFS backward — collect all upstream-reachable node IDs.
    const upstreamIds = new Set<string>()
    const bfsQ1 = [nodeId]
    const bfsV1 = new Set<string>([nodeId])
    while (bfsQ1.length > 0) {
      const cur = bfsQ1.shift()!
      for (const e of edges) {
        if (e.target === cur && !bfsV1.has(e.source)) {
          bfsV1.add(e.source)
          upstreamIds.add(e.source)
          bfsQ1.push(e.source)
        }
      }
    }

    // Step 2: Collect upstream machine nodes in BFS order (downstream → upstream).
    // Processing in this order guarantees that when we compute the demand on machine U,
    // all machines downstream of U already have their updated nMachines in workingN.
    const processOrder: string[] = []
    const bfsQ2 = [nodeId]
    const bfsV2 = new Set<string>([nodeId])
    while (bfsQ2.length > 0) {
      const cur = bfsQ2.shift()!
      for (const e of edges) {
        if (e.target === cur && upstreamIds.has(e.source) && !bfsV2.has(e.source)) {
          bfsV2.add(e.source)
          processOrder.push(e.source)
          bfsQ2.push(e.source)
        }
      }
    }

    // Step 3: Working nMachines map. Initialised from current values; target is set to newN.
    const workingN = new Map<string, number>()
    for (const n of nodes) {
      if (n.type === 'machineNode') workingN.set(n.id, n.data.nMachines)
    }
    workingN.set(nodeId, newN)

    // Compute demand that a single edge delivers to its consumer.
    // Traverses through Splitter / Merger nodes so every demand reaches a machine.
    function demandFromEdge(e: Edge, visited = new Set<string>()): number {
      const tgt = nodes.find((n) => n.id === e.target)
      if (!tgt) return 0
      if (tgt.type === 'machineNode' && tgt.data.recipe) {
        const inIdx = parseInt((e.targetHandle ?? 'in-0').replace('in-', ''))
        const inp = tgt.data.recipe.inputs[inIdx]
        if (!inp) return 0
        const ppmPerMachine = (inp.amount / tgt.data.recipe.batchTime) * 60
        return ppmPerMachine * (workingN.get(tgt.id) ?? tgt.data.nMachines) * (tgt.data.clockSpeed ?? 1)
      }
      if ((tgt.type === 'splitterNode' || tgt.type === 'mergerNode') && !visited.has(tgt.id)) {
        visited.add(tgt.id)
        return edges
          .filter((oe) => oe.source === tgt.id)
          .reduce((s, oe) => s + demandFromEdge(oe, visited), 0)
      }
      return 0
    }

    // Step 4: For each upstream machine (downstream → upstream order), compute the total
    // demand placed on each of its output slots from ALL consumers (not just our chain).
    // This naturally handles both scale-up and scale-down: downstream machines that have
    // already been updated in workingN propagate their new demand upward, while independent
    // machines outside the chain preserve their original demand.
    for (const upId of processOrder) {
      const upNode = nodes.find((n) => n.id === upId)
      if (!upNode || upNode.type !== 'machineNode' || !upNode.data.recipe) continue

      // Group outgoing edges by output slot.
      const slotDemand = new Map<number, number>()
      for (const e of edges) {
        if (e.source !== upId) continue
        const slotIdx = parseInt((e.sourceHandle ?? 'out-0').replace('out-', ''))
        slotDemand.set(slotIdx, (slotDemand.get(slotIdx) ?? 0) + demandFromEdge(e))
      }
      if (slotDemand.size === 0) continue

      // Required nMachines = max across all output slots (most-constrained output wins).
      let maxRequiredN = 1
      for (const [slotIdx, demand] of slotDemand) {
        const out = upNode.data.recipe.outputs[slotIdx]
        if (!out) continue
        let outPpm = (out.amount / upNode.data.recipe.batchTime) * 60
        if (upNode.data.recipe.machine === 'Miner' && upNode.data.recipe.batchTime === 60 && out.amount === 1) outPpm = 60
        if (outPpm > 0) maxRequiredN = Math.max(maxRequiredN, demand / outPpm)
      }

      workingN.set(upId, Math.round(Math.max(1, maxRequiredN) * 100) / 100)
    }

    // Step 5: Apply changes — only touch the target and its upstream machines.
    // Mark every modified node as autoLocked so useFlowSync doesn't immediately revert
    // the values back to the autoNMachines-computed maximum (which is based on upstream
    // supply capacity and would always push machines up to the highest possible count).
    let changed = false
    const updatedNodes = nodes.map((n) => {
      if (n.id !== nodeId && !upstreamIds.has(n.id)) return n
      if (n.type !== 'machineNode') return n
      const next = workingN.get(n.id)
      if (next === undefined || Math.abs(next - n.data.nMachines) < 0.005) return n
      changed = true
      return { ...n, data: { ...n.data, nMachines: next, autoLocked: true } }
    })

    if (!changed) return
    get()._pushHistory()
    set({ nodes: updatedNodes })
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
  markSaved: () => set({ isDirty: false }),

  _pushHistory: () => {
    const { nodes, edges, history } = get()
    const snapshot: HistoryEntry = {
      nodes: deepCopyNodes(nodes),
      edges: shallowCopyEdges(edges),
    }
    set({ history: [...history.slice(-49), snapshot], future: [], isDirty: true })
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
