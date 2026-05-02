import type { ParsedRecipe } from '@/lib/types/game'

export type MagicChoice = {
  part: string
  requiredPerMin: number
  options: ParsedRecipe[]
}

export type MagicResolved = {
  chosen: ParsedRecipe
  requiredPerMin: number
}

export type MagicPlan = {
  // Parts that still need user choice
  pendingChoices: MagicChoice[]
  // Resolved mapping for parts that already have a chosen recipe
  resolved: Record<string, MagicResolved>
}

function ppmForPartInRecipeOutput(recipe: ParsedRecipe, part: string): number {
  const out = recipe.outputs.find((o) => o.part === part)
  if (!out) return 0
  const base = (out.amount / recipe.batchTime) * 60
  if (recipe.machine === 'Miner' && recipe.batchTime === 60 && out.amount === 1) return 60
  return base
}

function inputPpmFromRecipe(recipe: ParsedRecipe, part: string): number {
  const ing = recipe.inputs.find((i) => i.part === part)
  if (!ing) return 0
  return (ing.amount / recipe.batchTime) * 60
}

export type PlanMagicChainArgs = {
  targetRecipe: ParsedRecipe
  targetOutputPart: string
  targetOutputPerMin: number
  recipes: ParsedRecipe[]
  // If true, automatically resolves extraction recipes (Water/Crude Oil/etc.) when unique.
  stopAtRawResources: boolean
  chosenByPart?: Record<string, ParsedRecipe>
}

/**
 * Produces a plan of which recipes must be chosen per part to build the full chain.
 * This function is pure and does not touch the store.
 */
export function planMagicChain({
  targetRecipe,
  targetOutputPart,
  targetOutputPerMin,
  recipes,
  stopAtRawResources,
  chosenByPart = {},
}: PlanMagicChainArgs): MagicPlan {
  const producersByPart = new Map<string, ParsedRecipe[]>()
  for (const r of recipes) {
    for (const o of r.outputs) {
      const arr = producersByPart.get(o.part) ?? []
      arr.push(r)
      producersByPart.set(o.part, arr)
    }
  }

  const pendingChoices: MagicChoice[] = []
  const resolved: Record<string, MagicResolved> = {}

  const visited = new Set<string>()

  function walk(part: string, requiredPerMin: number) {
    const preChosen = chosenByPart[part]

    // Se a peça já foi resolvida (sem preChosen), apenas acumula a demanda adicional
    // e propaga o delta para os inputs upstream. Isso corrige o caso onde a mesma
    // peça intermediária é necessária por múltiplos consumidores (ex: Iron Rod para
    // o Assembler E para o Screw Constructor).
    if (resolved[part] && !preChosen) {
      const delta = requiredPerMin
      resolved[part]!.requiredPerMin += delta
      const chosen = resolved[part]!.chosen
      const outPpm = ppmForPartInRecipeOutput(chosen, part)
      const machinesEq = outPpm > 0 ? delta / outPpm : 0
      for (const i of chosen.inputs) {
        const inPerMachine = inputPpmFromRecipe(chosen, i.part)
        const need = machinesEq * inPerMachine
        if (need > 0) walk(i.part, need)
      }
      return
    }

    // Previne recursão infinita apenas para novos caminhos (peça não resolvida ainda).
    const key = `${part}::${requiredPerMin.toFixed(4)}`
    if (visited.has(key)) return
    visited.add(key)

    if (preChosen) {
      resolved[part] = { chosen: preChosen, requiredPerMin }
      const outPpm = ppmForPartInRecipeOutput(preChosen, part)
      const machinesEq = outPpm > 0 ? requiredPerMin / outPpm : 0
      for (const i of preChosen.inputs) {
        const inPerMachine = inputPpmFromRecipe(preChosen, i.part)
        const need = machinesEq * inPerMachine
        if (need > 0) walk(i.part, need)
      }
      return
    }

    const options = producersByPart.get(part) ?? []
    if (options.length === 0) {
      if (!stopAtRawResources) return
      return
    }

    if (options.length === 1) {
      const chosen = options[0]
      resolved[part] = { chosen, requiredPerMin }
      const outPpm = ppmForPartInRecipeOutput(chosen, part)
      const machinesEq = outPpm > 0 ? requiredPerMin / outPpm : 0
      for (const i of chosen.inputs) {
        const inPerMachine = inputPpmFromRecipe(chosen, i.part)
        const need = machinesEq * inPerMachine
        if (need > 0) walk(i.part, need)
      }
      return
    }

    // Multiple recipes: require user choice. (Keep highest required rate if repeated.)
    const existing = pendingChoices.find((c) => c.part === part)
    if (existing) {
      existing.requiredPerMin = Math.max(existing.requiredPerMin, requiredPerMin)
      return
    }
    pendingChoices.push({ part, requiredPerMin, options })
  }

  // Root: compute how many machines equivalent to meet target output
  const rootOutPpm = ppmForPartInRecipeOutput(targetRecipe, targetOutputPart)
  const rootMachinesEq = rootOutPpm > 0 ? targetOutputPerMin / rootOutPpm : 0
  for (const i of targetRecipe.inputs) {
    const inPerMachine = inputPpmFromRecipe(targetRecipe, i.part)
    const need = rootMachinesEq * inPerMachine
    if (need > 0) walk(i.part, need)
  }

  return { pendingChoices, resolved }
}

