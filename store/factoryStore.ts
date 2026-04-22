'use client'

import { create } from 'zustand'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type XYPosition,
} from '@xyflow/react'
import type { Machine, ParsedRecipe } from '@/lib/gameData'

export type MachineNodeData = {
  machine: Machine
  recipe: ParsedRecipe
  availableRecipes: ParsedRecipe[]
  nMachines: number
  clockSpeed: number            // 0.01–2.5, padrão 1.0 (100%)
  minerVariant?: string         // ex: "Miner Mk.2"
  minerCapacity?: string        // ex: "Pure"
  outputRateOverride?: number   // se definido, substitui o cálculo automático de /min
  // computed by FactoryEditor — supply arriving at each input handle (index = handle index)
  incomingSupply?: number[]
  // computed by FactoryEditor — total demand on each output handle from connected nodes
  outgoingDemand?: number[]
}

export type MachineNode = Node<MachineNodeData, 'machineNode'>

export type MenuContext =
  | { type: 'canvas'; position: XYPosition; flowPosition: XYPosition }
  | { type: 'input'; nodeId: string; handleId: string; inputPart: string; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }
  | { type: 'output'; nodeId: string; handleId: string; outputPart: string; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }

type FactoryStore = {
  nodes: MachineNode[]
  edges: Edge[]
  menu: MenuContext | null

  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  openMenu: (ctx: MenuContext) => void
  closeMenu: () => void

  addRecipeNode: (recipe: ParsedRecipe, machine: Machine, flowPosition: XYPosition) => string
  setRecipe: (nodeId: string, recipe: ParsedRecipe) => void
  setNodeConfig: (nodeId: string, config: Partial<Pick<MachineNodeData, 'nMachines' | 'clockSpeed' | 'minerVariant' | 'minerCapacity' | 'outputRateOverride' | 'incomingSupply' | 'outgoingDemand'>>) => void
}

let nodeCounter = 0

export const useFactoryStore = create<FactoryStore>((set, get) => ({
  nodes: [],
  edges: [],
  menu: null,

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as MachineNode[],
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge({ ...connection, animated: true }, state.edges),
    })),

  openMenu: (ctx) => set({ menu: ctx }),
  closeMenu: () => set({ menu: null }),

  addRecipeNode: (recipe, machine, flowPosition) => {
    nodeCounter++
    const id = `machine-${nodeCounter}`
    const availableRecipes = get().nodes // not needed here, just use recipe
    const newNode: MachineNode = {
      id,
      type: 'machineNode',
      position: flowPosition,
      data: { machine, recipe, availableRecipes: [recipe], nMachines: 1, clockSpeed: 1 },
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
    return id
  },

  setRecipe: (nodeId, recipe) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, recipe } } : n
      ),
    })),

  setNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...config } } : n
      ),
    })),
}))
