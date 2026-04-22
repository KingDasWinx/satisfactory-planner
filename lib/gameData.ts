import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Ingredient, ParsedRecipe, Machine, Part, MultiMachineVariant, MultiMachineCapacity, MultiMachine, GameData } from '@/lib/types/game'

// Re-export types for backwards compatibility
export type { Ingredient, ParsedRecipe, Machine, Part, MultiMachineVariant, MultiMachineCapacity, MultiMachine, GameData }

// ─── Raw types from game_data.json ───────────────────────────────────────────

type RawPart = { Part: string; Amount: string }

type RawMachine = {
  Name: string
  Tier: string
  AveragePower?: string
  MinPower?: string
  OverclockPowerExponent?: string
  MaxProductionShards?: number
  Cost: RawPart[]
}

type RawRecipe = {
  Name: string
  Machine: string
  BatchTime: string
  Tier: string
  Alternate?: boolean
  MinPower?: string
  AveragePower?: string
  Parts: RawPart[]
}

type RawMultiMachineVariant = { Name: string; PartsRatio?: string; Default?: boolean }
type RawMultiMachineCapacity = { Name: string; PartsRatio?: string; PowerRatio?: string; Default?: boolean; Color?: number; Description?: string }
type RawMultiMachine = {
  Name: string
  ShowPpm?: boolean
  AutoRound?: boolean
  DefaultMax?: string
  Machines?: RawMultiMachineVariant[]
  Capacities?: RawMultiMachineCapacity[]
}

type RawGameData = {
  Machines: RawMachine[]
  MultiMachines: RawMultiMachine[]
  Parts: Array<{ Name: string; Tier: string; SinkPoints: number }>
  Recipes: RawRecipe[]
}

// ─── Loader ───────────────────────────────────────────────────────────────────

let _cache: GameData | undefined


function evalFraction(value: string): number {
  if (value.includes('/')) {
    const [num, den] = value.split('/')
    return parseFloat(num) / parseFloat(den)
  }
  return parseFloat(value)
}

export async function getGameData(): Promise<GameData> {
  if (_cache) return _cache

  const filePath = path.join(process.cwd(), 'data', 'game', 'game_data.json')
  const raw: RawGameData = JSON.parse(await readFile(filePath, 'utf-8'))

  const machines: Machine[] = raw.Machines.map((m) => ({
    name: m.Name,
    tier: m.Tier,
    averagePower: m.AveragePower ? Math.abs(evalFraction(m.AveragePower)) : 0,
    maxProductionShards: m.MaxProductionShards ?? 0,
  }))

  const recipes: ParsedRecipe[] = raw.Recipes.map((r) => {
    const inputs: Ingredient[] = []
    const outputs: Ingredient[] = []
    for (const p of r.Parts) {
      const amount = evalFraction(p.Amount)
      if (amount < 0) {
        inputs.push({ part: p.Part, amount: Math.abs(amount) })
      } else {
        outputs.push({ part: p.Part, amount })
      }
    }
    return {
      name: r.Name,
      machine: r.Machine,
      batchTime: evalFraction(r.BatchTime),
      tier: r.Tier,
      alternate: r.Alternate ?? false,
      inputs,
      outputs,
    }
  })

  const parts: Part[] = raw.Parts.map((p) => ({
    name: p.Name,
    tier: p.Tier,
    sinkPoints: p.SinkPoints,
  }))

  const multiMachines: MultiMachine[] = raw.MultiMachines.map((mm) => ({
    name: mm.Name,
    showPpm: mm.ShowPpm ?? false,
    defaultMax: mm.DefaultMax ? evalFraction(mm.DefaultMax) : 0,
    machines: (mm.Machines ?? []).map((v): MultiMachineVariant => ({
      name: v.Name,
      partsRatio: v.PartsRatio ? evalFraction(v.PartsRatio) : 1,
      isDefault: v.Default ?? false,
    })),
    capacities: (mm.Capacities ?? []).map((c): MultiMachineCapacity => ({
      name: c.Name,
      partsRatio: c.PartsRatio ? evalFraction(c.PartsRatio) : 1,
      isDefault: c.Default ?? false,
    })),
  }))

  _cache = { machines, recipes, parts, multiMachines }
  return _cache
}
