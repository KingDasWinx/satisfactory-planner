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
import type { MachineNodeData, MachineNode, MenuContext } from '@/lib/types/store'

export type { MachineNodeData, MachineNode, MenuContext }

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
    void get().nodes // suppress unused warning — kept for referential stability
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
