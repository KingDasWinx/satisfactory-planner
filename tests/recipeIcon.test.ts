import test from 'node:test'
import assert from 'node:assert/strict'
import type { ParsedRecipe } from '../lib/types/game'
import { getRecipePrimaryIconPart } from '../lib/utils/recipeIcon'

function r(partOut: string, amount = 1, extraOutputs?: Array<{ part: string; amount: number }>): ParsedRecipe {
  return {
    name: 'Any',
    machine: 'Constructor',
    batchTime: 4,
    tier: '0-1',
    alternate: false,
    inputs: [],
    outputs: [{ part: partOut, amount }, ...(extraOutputs ?? [])],
  }
}

test('getRecipePrimaryIconPart returns null when no outputs', () => {
  const recipe: ParsedRecipe = {
    name: 'NoOut',
    machine: 'Constructor',
    batchTime: 4,
    tier: '0-1',
    alternate: false,
    inputs: [],
    outputs: [],
  }
  assert.equal(getRecipePrimaryIconPart(recipe), null)
})

test('getRecipePrimaryIconPart returns the only output part', () => {
  assert.equal(getRecipePrimaryIconPart(r('Iron Ingot')), 'Iron Ingot')
})

test('getRecipePrimaryIconPart picks the largest amount output', () => {
  const recipe = r('A', 1, [{ part: 'B', amount: 5 }])
  assert.equal(getRecipePrimaryIconPart(recipe), 'B')
})

test('getRecipePrimaryIconPart is stable across alternate recipes when outputs match', () => {
  const normal = r('Adaptive Control Unit', 1)
  const alternate: ParsedRecipe = { ...normal, name: 'Alternate ACU', alternate: true }
  assert.equal(getRecipePrimaryIconPart(normal), 'Adaptive Control Unit')
  assert.equal(getRecipePrimaryIconPart(alternate), 'Adaptive Control Unit')
})

