export interface Ingredient {
  part: string
  amount: number
}

export interface ParsedRecipe {
  name: string
  machine: string
  batchTime: number
  tier: string
  alternate: boolean
  inputs: Ingredient[]
  outputs: Ingredient[]
}

export interface Machine {
  name: string
  tier: string
  averagePower: number
  maxProductionShards: number
}

export interface Part {
  name: string
  tier: string
  sinkPoints: number
}

export interface MultiMachineVariant {
  name: string
  partsRatio: number
  isDefault: boolean
}

export interface MultiMachineCapacity {
  name: string
  partsRatio: number
  isDefault: boolean
}

export interface MultiMachine {
  name: string
  showPpm: boolean
  defaultMax: number
  machines: MultiMachineVariant[]
  capacities: MultiMachineCapacity[]
}

export interface GameData {
  machines: Machine[]
  recipes: ParsedRecipe[]
  parts: Part[]
  multiMachines: MultiMachine[]
}
