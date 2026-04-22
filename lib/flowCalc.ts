import type { MultiMachine } from '@/lib/types/game'
import type { MachineNodeData } from '@/lib/types/store'
import type { NodeRates } from '@/lib/types/flow'

export type { NodeRates }

const EXTRACTOR_MULTI_NAMES = ['Miner', 'Oil Extractor', 'Resource Well Extractor', 'Water Extractor']

export function calcNodeRates(data: MachineNodeData, multiMachines: MultiMachine[]): NodeRates {
  const { recipe, nMachines, clockSpeed, minerVariant, minerCapacity, outputRateOverride } = data

  const inputs = recipe?.inputs ?? []
  const outputs = recipe?.outputs ?? []

  const multiMachine = multiMachines.find((mm) =>
    EXTRACTOR_MULTI_NAMES.includes(mm.name) &&
    mm.machines.some((v) => v.name === data.machine.name || mm.name === data.machine.name)
  )

  if (multiMachine && multiMachine.machines.length > 0) {
    const variant = multiMachine.machines.find((v) => v.name === (minerVariant ?? data.machine.name))
      ?? multiMachine.machines.find((v) => v.isDefault)
      ?? multiMachine.machines[0]

    const capacity = multiMachine.capacities.find((c) => c.name === (minerCapacity ?? ''))
      ?? multiMachine.capacities.find((c) => c.isDefault)
      ?? { partsRatio: 1, name: 'Normal', isDefault: true }

    const ppm = outputRateOverride ?? (variant.partsRatio * capacity.partsRatio * nMachines * clockSpeed)

    return {
      inputs: [],
      outputs: outputs.map(() => ppm),
    }
  }

  const batchTime = recipe?.batchTime ?? 1
  const multiplier = (60 / batchTime) * nMachines * clockSpeed

  if (outputRateOverride !== undefined && outputs.length > 0) {
    // Scale all outputs proportionally keeping their ratios
    const baseOutputTotal = outputs.reduce((s, o) => s + o.amount * (60 / batchTime), 0)
    const scale = baseOutputTotal > 0 ? outputRateOverride / baseOutputTotal : 1
    const scaledMultiplier = (60 / batchTime) * scale
    return {
      inputs: inputs.map((ing) => ing.amount * scaledMultiplier),
      outputs: outputs.map((out) => out.amount * scaledMultiplier),
    }
  }

  return {
    inputs: inputs.map((ing) => ing.amount * multiplier),
    outputs: outputs.map((out) => out.amount * multiplier),
  }
}

// Returns the rate per single machine at the given clockSpeed for a specific handle.
// handleType: 'input' | 'output', handleIdx: index in recipe.inputs or recipe.outputs
export function ratePerMachine(
  data: MachineNodeData,
  multiMachines: MultiMachine[],
  handleType: 'input' | 'output',
  handleIdx: number,
): number {
  const { recipe, clockSpeed, minerVariant, minerCapacity } = data

  const multiMachine = multiMachines.find((mm) =>
    EXTRACTOR_MULTI_NAMES.includes(mm.name) &&
    mm.machines.some((v) => v.name === data.machine.name || mm.name === data.machine.name)
  )

  if (multiMachine && multiMachine.machines.length > 0) {
    if (handleType === 'input') return 0 // extractors have no inputs
    const variant = multiMachine.machines.find((v) => v.name === (minerVariant ?? data.machine.name))
      ?? multiMachine.machines.find((v) => v.isDefault)
      ?? multiMachine.machines[0]
    const capacity = multiMachine.capacities.find((c) => c.name === (minerCapacity ?? ''))
      ?? multiMachine.capacities.find((c) => c.isDefault)
      ?? { partsRatio: 1, name: 'Normal', isDefault: true }
    return variant.partsRatio * capacity.partsRatio * clockSpeed
  }

  const batchTime = recipe?.batchTime ?? 1
  const parts = handleType === 'input' ? (recipe?.inputs ?? []) : (recipe?.outputs ?? [])
  const amount = parts[handleIdx]?.amount ?? 0
  return (amount / batchTime) * 60 * clockSpeed
}

// How many machines needed so that the handle's rate meets targetPerMin
export function machinesNeededFor(ratePerOne: number, targetPerMin: number): number {
  return ratePerOne > 0 ? Math.ceil(targetPerMin / ratePerOne) : 0
}

export function edgeSufficiencyColor(supply: number, demand: number): string {
  if (demand === 0) return '#64748b'
  const ratio = supply / demand
  if (ratio >= 1) return '#22c55e'
  if (ratio >= 0.5) return '#f59e0b'
  return '#ef4444'
}

// Distributes totalSupply among outputs, redistributing excess from saturated (demand-limited) outputs.
// outputDemands[i] = Infinity means unconnected/unlimited.
export function calcSplitterDistribution(totalSupply: number, outputDemands: number[]): number[] {
  const n = outputDemands.length
  if (n === 0) return []

  let remaining = totalSupply
  const result = new Array<number>(n).fill(0)
  const saturated = new Array<boolean>(n).fill(false)

  for (let iter = 0; iter < n; iter++) {
    const freeSlots = outputDemands.filter((_, i) => !saturated[i]).length
    if (freeSlots === 0) break
    const share = remaining / freeSlots
    let newlySaturated = false
    for (let i = 0; i < n; i++) {
      if (saturated[i]) continue
      if (outputDemands[i] <= share) {
        result[i] = outputDemands[i]
        remaining -= outputDemands[i]
        saturated[i] = true
        newlySaturated = true
      }
    }
    if (!newlySaturated) {
      for (let i = 0; i < n; i++) {
        if (!saturated[i]) result[i] = share
      }
      break
    }
  }
  return result
}
