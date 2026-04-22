import type { Node, XYPosition } from '@xyflow/react'
import type { Machine, ParsedRecipe } from '@/lib/types/game'

export type MachineNodeData = {
  machine: Machine
  recipe: ParsedRecipe
  availableRecipes: ParsedRecipe[]
  nMachines: number
  clockSpeed: number            // 0.01–2.5, padrão 1.0 (100%)
  minerVariant?: string
  minerCapacity?: string
  outputRateOverride?: number
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
