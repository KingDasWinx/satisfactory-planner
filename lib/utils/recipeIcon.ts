import type { ParsedRecipe } from '@/lib/types/game'

export function getRecipePrimaryIconPart(recipe: ParsedRecipe): string | null {
  if (!recipe.outputs || recipe.outputs.length === 0) return null
  let best = recipe.outputs[0]
  if (!best) return null

  for (const o of recipe.outputs) {
    if (o.amount > best.amount) best = o
  }

  return best.part ?? null
}

