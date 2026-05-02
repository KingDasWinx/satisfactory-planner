import test from 'node:test'
import assert from 'node:assert/strict'
import type { ParsedRecipe } from '../lib/types/game'

// Simula o cálculo que applyMagicPlanner usa para semear a demanda inicial.
// Bug 2: quando effectiveRates.inputs[i] > 0 (throttled), o required usa o valor throttled
// em vez da capacidade configurada (fallback).

function ppmForIn(recipe: ParsedRecipe, part: string): number {
  const ing = recipe.inputs.find((i) => i.part === part)
  if (!ing) return 0
  return (ing.amount / recipe.batchTime) * 60
}

const rotorRecipe: ParsedRecipe = {
  name: 'Rotor',
  machine: 'Assembler',
  batchTime: 15,
  tier: '0-1',
  alternate: false,
  inputs: [
    { part: 'Iron Rod', amount: 5 },
    { part: 'Screw', amount: 25 },
  ],
  outputs: [{ part: 'Rotor', amount: 1 }],
}

test('magic planner seed: deve usar capacidade configurada (fallback), não effectiveRates throttled', () => {
  const nMachines = 1
  const clockSpeed = 1
  const throttledEffectiveInput = 15.8  // supply throttled, menos do que os 20 necessários

  // Comportamento ATUAL (com bug): usa throttled
  const buggyRequired = throttledEffectiveInput > 0 ? throttledEffectiveInput : ppmForIn(rotorRecipe, 'Iron Rod') * nMachines * clockSpeed
  assert.notStrictEqual(buggyRequired, 20, 'Com bug, o required está errado (throttled)')

  // Comportamento CORRETO após fix: usa sempre fallback
  const correctRequired = ppmForIn(rotorRecipe, 'Iron Rod') * nMachines * clockSpeed
  assert.strictEqual(correctRequired, 20, 'Após fix, deve semear 20 iron rod/min para 1x Assembler')
})

test('magic planner seed para Screw: deve usar capacidade configurada', () => {
  const correctRequired = ppmForIn(rotorRecipe, 'Screw') * 1 * 1
  assert.strictEqual(correctRequired, 100, '1x Assembler precisa de 100 screw/min')
})
