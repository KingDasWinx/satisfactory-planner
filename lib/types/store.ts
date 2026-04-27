import type { Node, XYPosition, Edge } from '@xyflow/react'
import type { Machine, ParsedRecipe } from '@/lib/types/game'
import type { NodeRates } from '@/lib/types/flow'

export type MachineNodeData = {
  machine: Machine
  recipe: ParsedRecipe
  availableRecipes: ParsedRecipe[]
  nMachines: number
  clockSpeed: number
  // Computed: effective machine count based on available input (can be fractional).
  autoNMachines?: number
  // Persisted: if true, this node stops receiving automatic nMachines updates
  // after the user manually edits quantity/clock/overrides.
  autoLocked?: boolean
  // Marker for nodes created by the magic planner (used for one-time auto adjustments).
  createdByMagic?: boolean
  // Computed: prevents re-applying the auto->config promotion repeatedly.
  magicAutoApplied?: boolean
  minerVariant?: string
  minerCapacity?: string
  outputRateOverride?: number
  incomingSupply?: number[]
  outgoingDemand?: number[]
  incomingPotential?: number[]
  effectiveRates?: NodeRates
  efficiency?: number
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

export type StorageNodeData = {
  incomingSupply?: number[]
  outgoingDemand?: number[]
  incomingRatesByPart?: Record<string, number>
  outgoingRatesByPart?: Record<string, number>
}
export type StorageNode = Node<StorageNodeData, 'storageNode'>

export type TextNodeData = {
  text: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderColor?: string
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: 400 | 600 | 700
  italic?: boolean
  underline?: boolean
  padding?: number
  locked?: boolean
  autoSizeHeight?: boolean
}
export type TextNode = Node<TextNodeData, 'textNode'>

export type FrameNodeData = {
  label: string
  color?: string
  locked?: boolean
}
export type FrameNode = Node<FrameNodeData, 'frameNode'>

export type FactoryNode = MachineNode | SplitterNode | MergerNode | StorageNode | TextNode | FrameNode

export type MenuContext =
  | { type: 'canvas'; position: XYPosition; flowPosition: XYPosition }
  | { type: 'input'; nodeId: string; handleId: string; inputPart: string; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }
  | { type: 'output'; nodeId: string; handleId: string; outputPart: string; outputParts: string[]; position: XYPosition; nodeFlowPosition: XYPosition; dropFlowPosition?: XYPosition }
  | { type: 'context'; position: XYPosition; flowPosition: XYPosition }
  | { type: 'nodeContext'; nodeId: string; position: XYPosition; flowPosition: XYPosition }
  | { type: 'magicWizard'; nodeId: string; position: XYPosition }

export type ClipboardData = {
  nodes: FactoryNode[]
  edges: Edge[]
  centroid: { x: number; y: number }
}

export type HistoryEntry = {
  nodes: FactoryNode[]
  edges: Edge[]
}
