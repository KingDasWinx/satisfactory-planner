import test from 'node:test'
import assert from 'node:assert/strict'
import { planMagicChain } from '../lib/utils/magicPlanner'
import type { ParsedRecipe } from '../lib/types/game'

// Receitas mínimas para reproduzir o bug de acumulação
const ironRodRecipe: ParsedRecipe = {
  name: 'Iron Rod',
  machine: 'Constructor',
  batchTime: 4,
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Ingot', amount: 1 }],
  outputs: [{ part: 'Iron Rod', amount: 1 }],
}
const screwRecipe: ParsedRecipe = {
  name: 'Screw',
  machine: 'Constructor',
  batchTime: 6,
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Rod', amount: 1 }],
  outputs: [{ part: 'Screw', amount: 4 }],
}
const rotorRecipe: ParsedRecipe = {
  name: 'Rotor',
  machine: 'Assembler',
  batchTime: 15,
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Rod', amount: 5 }, { part: 'Screw', amount: 25 }],
  outputs: [{ part: 'Rotor', amount: 1 }],
}
const ingotRecipe: ParsedRecipe = {
  name: 'Iron Ingot',
  machine: 'Smelter',
  batchTime: 2,
  tier: '0-1',
  alternate: false,
  inputs: [{ part: 'Iron Ore', amount: 1 }],
  outputs: [{ part: 'Iron Ingot', amount: 1 }],
}

test('planMagicChain: Iron Rod requiredPerMin deve acumular demanda do Assembler + Screw Constructor', () => {
  const plan = planMagicChain({
    targetRecipe: rotorRecipe,
    targetOutputPart: 'Rotor',
    targetOutputPerMin: 4,  // 1x Assembler a 4 rotors/min
    recipes: [ironRodRecipe, screwRecipe, rotorRecipe, ingotRecipe],
    stopAtRawResources: true,
  })

  const ironRodResolved = plan.resolved['Iron Rod']
  assert.ok(ironRodResolved, 'Iron Rod deve estar no resolved')
  // Assembler precisa de 20/min + Screw Constructor (2.5x) precisa de 25/min = 45/min total
  assert.strictEqual(
    ironRodResolved.requiredPerMin,
    45,
    `Iron Rod deve acumular 20 (assembler) + 25 (screw constructor) = 45/min, mas got ${ironRodResolved?.requiredPerMin}`
  )
})

test('planMagicChain: Iron Ingot requiredPerMin deve acumular toda a demanda upstream', () => {
  const plan = planMagicChain({
    targetRecipe: rotorRecipe,
    targetOutputPart: 'Rotor',
    targetOutputPerMin: 4,
    recipes: [ironRodRecipe, screwRecipe, rotorRecipe, ingotRecipe],
    stopAtRawResources: true,
  })

  // 45 iron rods/min at 15 iron rods/machine = 3 machines = 45 ingots/min
  const ingotResolved = plan.resolved['Iron Ingot']
  assert.ok(ingotResolved, 'Iron Ingot deve estar no resolved')
  assert.strictEqual(
    ingotResolved.requiredPerMin,
    45,
    `Iron Ingot deve ser 45/min, mas got ${ingotResolved?.requiredPerMin}`
  )
})
