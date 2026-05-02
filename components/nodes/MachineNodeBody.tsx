'use client'

import { useState } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import { fmt } from '@/lib/utils/format'
import { ExtractorRateInput } from './ExtractorRateInput'
import { MachineNodeUtilBar } from './MachineNodeUtilBar'
import type { MachineNodeData } from '@/lib/types/store'
import type { NodeRates } from '@/lib/types/flow'
import type { ParsedRecipe } from '@/lib/types/game'

interface MachineNodeBodyProps {
  id: string
  data: MachineNodeData
  baseRates: NodeRates
  effectiveRates: NodeRates
  isExtractor: boolean
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function MachineNodeBody({ id, data, baseRates, effectiveRates, isExtractor }: MachineNodeBodyProps) {
  const { recipe, availableRecipes, nMachines, autoNMachines, clockSpeed, incomingSupply, incomingPotential, outgoingDemand, autoLocked } = data
  const displayMachines = (!autoLocked && autoNMachines !== undefined) ? autoNMachines : nMachines
  const setRecipe = useFactoryStore((s) => s.setRecipe)
  const setNodeConfig = useFactoryStore((s) => s.setNodeConfig)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [editingOutput, setEditingOutput] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')

  function commitEditOutput() {
    if (editingOutput === null) return
    const n = parseFloat(editingValue)
    setNodeConfig(id, { outputRateOverride: isNaN(n) || editingValue === '' ? undefined : Math.max(0, n) })
    setEditingOutput(null)
  }

  const inputs = recipe?.inputs ?? []
  const outputs = recipe?.outputs ?? []

  if (!recipe) {
    return (
      <div className="px-3 py-2">
        <span className="text-xs text-slate-500 italic">Sem receita disponível</span>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={() => setRecipeOpen(!recipeOpen)}
          className="text-left text-xs text-slate-300 hover:text-white flex items-center gap-1 min-w-0"
        >
          <span className="font-medium truncate">
            {recipe.alternate && <span className="text-purple-400 mr-1">★</span>}
            {recipe.name}
          </span>
          {availableRecipes.length > 1 && (
            <span className="text-slate-500 shrink-0">{recipeOpen ? '▲' : '▼'}</span>
          )}
        </button>
        <span
          className="text-xs text-slate-400 shrink-0 bg-slate-800 rounded px-1.5 py-0.5"
          title={
            !autoLocked && autoNMachines !== undefined
              ? `Máquinas efetivas (por gargalo): ${displayMachines} · Configurado: ${nMachines} · Clock ${Math.round(clockSpeed * 100)}%`
              : `Configuração: ${nMachines} máquina(s) · Clock ${Math.round(clockSpeed * 100)}%`
          }
        >
          ×{displayMachines} · {Math.round(clockSpeed * 100)}%
        </span>
      </div>

      {recipeOpen && availableRecipes.length > 1 && (
        <div className="rounded border border-slate-700 bg-slate-800 max-h-40 overflow-y-auto">
          {availableRecipes.map((r: ParsedRecipe) => (
            <button
              key={r.name}
              onClick={() => { setRecipe(id, r); setRecipeOpen(false) }}
              className={`w-full text-left px-2 py-1 text-xs hover:bg-slate-700 ${r.name === recipe.name ? 'text-amber-400' : 'text-slate-300'}`}
            >
              {r.alternate && <span className="text-purple-400 mr-1">★</span>}
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 text-xs">
        <div className="space-y-0.5">
          {inputs.map((ing, i) => {
            const need = baseRates.inputs[i] ?? 0
            const got = incomingSupply?.[i]
            return (
              <div key={i} className="flex flex-col gap-0">
                <div className="flex items-center gap-1 text-blue-300">
                  <span className="text-blue-500 shrink-0">→</span>
                  <span className="truncate">{ing.part}</span>
                </div>
                <div className="flex items-center gap-1 pl-3 tabular-nums">
                  {got !== undefined ? (
                    <>
                      <span
                        className={r1(got) >= r1(need) ? 'text-emerald-400' : 'text-red-400'}
                        title={`Recebendo ${fmt(got)}/m de ${fmt(need)}/m necessários`}
                      >
                        {fmt(got)}
                      </span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400" title={`Necessário (capacidade total): ${fmt(need)}/m`}>
                        {fmt(need)}/m
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500" title={`Necessário (capacidade total): ${fmt(need)}/m`}>
                      {fmt(need)}/m
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="space-y-0.5">
          {outputs.map((out, i) => {
            const prod = effectiveRates.outputs[i] ?? 0
            const consumed = outgoingDemand?.[i]
            return (
              <div key={i} className="flex flex-col gap-0">
                <div className="flex items-center gap-1 text-emerald-300">
                  <span className="text-emerald-500 shrink-0">←</span>
                  <span className="truncate">{out.part}</span>
                </div>
                <div className="flex items-center gap-1 pl-3 tabular-nums">
                  {isExtractor ? (
                    <>
                      <ExtractorRateInput
                        value={prod}
                        editing={editingOutput === i}
                        editingValue={editingValue}
                        onStartEdit={(val) => { setEditingOutput(i); setEditingValue(String(val)) }}
                        onChangeValue={setEditingValue}
                        onCommit={commitEditOutput}
                        onCancel={() => setEditingOutput(null)}
                      />
                      {consumed !== undefined && (
                        <>
                          <span className="text-slate-600">/</span>
                          <span className={r1(consumed) <= r1(prod) ? 'text-emerald-400' : 'text-red-400'}>{fmt(consumed)}/m</span>
                        </>
                      )}
                    </>
                  ) : consumed !== undefined ? (
                    <>
                      <span className="text-slate-400" title={`Produção efetiva: ${fmt(prod)}/m`}>
                        {fmt(prod)}
                      </span>
                      <span className="text-slate-600">/</span>
                      <span
                        className={r1(consumed) <= r1(prod) ? 'text-emerald-400' : 'text-red-400'}
                        title={`Puxado pelo downstream: ${fmt(consumed)}/m`}
                      >
                        {fmt(consumed)}/m
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500" title={`Produção efetiva: ${fmt(prod)}/m`}>
                      {fmt(prod)}/m
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Capacidade sobrando na saída (ninguém está puxando tudo) */}
      {!isExtractor && outputs.length > 0 && outgoingDemand && (
        (() => {
          let unusedTotal = 0
          let unusedMachinesEq = 0
          for (let i = 0; i < outputs.length; i++) {
            const prod = effectiveRates.outputs[i] ?? 0
            const pulled = outgoingDemand[i] ?? 0
            const unused = Math.max(0, prod - pulled)
            unusedTotal += unused
            const perOneOut = nMachines > 0 ? (baseRates.outputs[i] ?? 0) / nMachines : 0
            if (perOneOut > 0) unusedMachinesEq = Math.max(unusedMachinesEq, unused / perOneOut)
          }
          if (!(unusedTotal > 0.01)) return null
          // Se a sobra equivale a ~0.00 máquina, não vale poluir a UI com isso.
          if (unusedMachinesEq < 0.01) return null
          return (
            <div
              className="mt-1 rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-300"
              title="Você tem capacidade de produção sobrando: o downstream não está puxando tudo."
            >
              <span className="text-slate-400 font-bold">Sobra</span>
              <span className="text-slate-500"> · </span>
              <span>{fmt(unusedTotal)}/m</span>
              <span className="text-slate-500"> · </span>
              <span>≈ -{fmt(unusedMachinesEq)} máquina (equiv.)</span>
            </div>
          )
        })()
      )}

      <MachineNodeUtilBar inputs={inputs} rates={baseRates} incomingSupply={incomingSupply} />
    </div>
  )
}
