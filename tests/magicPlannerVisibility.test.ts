import test from 'node:test'
import assert from 'node:assert/strict'
import type { Machine } from '../lib/types/game'
import type { ParsedRecipe } from '../lib/types/game'
import type { FactoryNode } from '../lib/types/store'
import { showMagicPlannerInContextMenu } from '../lib/utils/magicPlannerVisibility'

const dummyMachine: Machine = {
  name: 'Constructor',
  tier: '0-1',
  averagePower: 4,
  maxProductionShards: 0,
}

function recipeWithInputs(inputs: ParsedRecipe['inputs']): ParsedRecipe {
  return {
    name: 'With inputs',
    machine: 'Constructor',
    batchTime: 4,
    tier: '0-1',
    alternate: false,
    inputs,
    outputs: [{ part: 'Iron Ingot', amount: 1 }],
  }
}

function machineNodeWithRecipe(recipe: ParsedRecipe): FactoryNode {
  return {
    id: 'm1',
    type: 'machineNode',
    position: { x: 0, y: 0 },
    data: {
      machine: dummyMachine,
      recipe,
      availableRecipes: [recipe],
      nMachines: 1,
      clockSpeed: 1,
    },
  }
}

/** Runtime shape without recipe (guarded by showMagicPlannerInContextMenu). */
function machineNodeMissingRecipe(): FactoryNode {
  return {
    id: 'm1',
    type: 'machineNode',
    position: { x: 0, y: 0 },
    data: {
      machine: dummyMachine,
      availableRecipes: [],
      nMachines: 1,
      clockSpeed: 1,
    },
  } as FactoryNode
}

test('showMagicPlannerInContextMenu is false for splitter, merger, storage', () => {
  assert.equal(
    showMagicPlannerInContextMenu({
      id: 's',
      type: 'splitterNode',
      position: { x: 0, y: 0 },
      data: {},
    }),
    false,
  )
  assert.equal(
    showMagicPlannerInContextMenu({
      id: 'm',
      type: 'mergerNode',
      position: { x: 0, y: 0 },
      data: {},
    }),
    false,
  )
  assert.equal(
    showMagicPlannerInContextMenu({
      id: 'st',
      type: 'storageNode',
      position: { x: 0, y: 0 },
      data: {},
    }),
    false,
  )
})

test('showMagicPlannerInContextMenu is false for text and frame nodes', () => {
  assert.equal(
    showMagicPlannerInContextMenu({
      id: 't',
      type: 'textNode',
      position: { x: 0, y: 0 },
      data: { text: '' },
    }),
    false,
  )
  assert.equal(
    showMagicPlannerInContextMenu({
      id: 'f',
      type: 'frameNode',
      position: { x: 0, y: 0 },
      data: { label: '' },
    }),
    false,
  )
})

test('showMagicPlannerInContextMenu is false for machine without recipe or without inputs', () => {
  assert.equal(showMagicPlannerInContextMenu(machineNodeMissingRecipe()), false)
  const extractorStyle = recipeWithInputs([])
  assert.equal(showMagicPlannerInContextMenu(machineNodeWithRecipe(extractorStyle)), false)
})

test('showMagicPlannerInContextMenu is true for machine with at least one recipe input', () => {
  const withIn = recipeWithInputs([{ part: 'Iron Ore', amount: 1 }])
  assert.equal(showMagicPlannerInContextMenu(machineNodeWithRecipe(withIn)), true)
})
