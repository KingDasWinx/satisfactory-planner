import type { Node, XYPosition, Edge } from '@xyflow/react'
import type { Machine, ParsedRecipe } from '@/lib/types/game'

export type MachineNodeData = {
  machine: Machine
  recipe: ParsedRecipe
  availableRecipes: ParsedRecipe[]
  nMachines: number
  clockSpeed: number
  minerVariant?: string
  minerCapacity?: string
  outputRateOverride?: number
  incomingSupply?: number[]
  outgoingDemand?: number[]
}

export type MachineNode = Node<MachineNodeData, 'machineNode'>

export type SplitterNodeData = {
  incomingSupply?: number[]
  outgoingDemand?: number[]
}

export type SplitterNode = Node<SplitterNodeData, 'splitterNode'>

export type MergerNodeData = {
  incomingSupply?: number[]
  outgoingDemand?: number[]
}

export type MergerNode = Node<MergerNodeData, 'mergerNode'>

export type FactoryNode = MachineNode | SplitterNode | MergerNode

export type MenuContext =
  | { type: 'canvas'; position: XYPosition; flowPosition: XYPosition }
  | { type: 'input'; nodeId: string; handleId: string; inputPart: string; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }
  | { type: 'output'; nodeId: string; handleId: string; outputPart: string; outputParts: string[]; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }

export type ClipboardData = {
  nodes: FactoryNode[]
  edges: Edge[]
  centroid: { x: number; y: number }
}

export type HistoryEntry = {
  nodes: FactoryNode[]
  edges: Edge[]
}
