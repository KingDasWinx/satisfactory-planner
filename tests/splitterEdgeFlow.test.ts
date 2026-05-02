import test from 'node:test'
import assert from 'node:assert/strict'
import { calcSplitterDistribution } from '../lib/flowCalc'

// Verificação que a distribuição do Splitter não afeta o supply da aresta upstream.
// Bug 1: edge predecessor→splitter deve mostrar supplyThisEdge (60), não splitterInputDemand (18).
test('calcSplitterDistribution: supply 60, demands [8, 10] — distribuição correta', () => {
  const result = calcSplitterDistribution(60, [8, 10, Infinity])
  assert.strictEqual(result[0], 8)
  assert.strictEqual(result[1], 10)
})

test('calcSplitterDistribution: supply 60, demands [8, 10] apenas 2 conectados — restante é perdido', () => {
  const result = calcSplitterDistribution(60, [8, 10])
  assert.strictEqual(result[0], 8)
  assert.strictEqual(result[1], 10)
  // Total distribuído = 18, 42 são perdidos (splitter com saídas desconectadas)
  const distributed = result.reduce((s, v) => s + v, 0)
  assert.strictEqual(distributed, 18)
})
