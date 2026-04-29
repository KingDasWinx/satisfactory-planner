import type { FactoryNode } from '@/lib/types/store'

/** Whether the node context menu should offer "Mágica" (upstream chain planner). */
export function showMagicPlannerInContextMenu(node: FactoryNode): boolean {
  switch (node.type) {
    case 'splitterNode':
    case 'mergerNode':
    case 'storageNode':
    case 'textNode':
    case 'frameNode':
      return false
    case 'machineNode': {
      const recipe = node.data.recipe
      if (!recipe) return false
      return recipe.inputs.length > 0
    }
  }
}
