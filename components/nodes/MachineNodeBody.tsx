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
  rates: NodeRates
  isExtractor: boolean
}

export function MachineNodeBody({ id, data, rates, isExtractor }: MachineNodeBodyProps) {
  const { recipe, availableRecipes, nMachines, clockSpeed, incomingSupply, outgoingDemand } = data
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
        <span className="text-xs text-slate-400 shrink-0 bg-slate-800 rounded px-1.5 py-0.5">
          ×{nMachines} · {Math.round(clockSpeed * 100)}%
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
            const need = rates.inputs[i] ?? 0
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
                      <span className={got >= need ? 'text-emerald-400' : 'text-red-400'}>{fmt(got)}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-slate-400">{fmt(need)}/m</span>
                    </>
                  ) : (
                    <span className="text-slate-500">{fmt(need)}/m</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="space-y-0.5">
          {outputs.map((out, i) => {
            const prod = rates.outputs[i] ?? 0
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
                          <span className={consumed <= prod ? 'text-emerald-400' : 'text-red-400'}>{fmt(consumed)}/m</span>
                        </>
                      )}
                    </>
                  ) : consumed !== undefined ? (
                    <>
                      <span className="text-slate-400">{fmt(prod)}</span>
                      <span className="text-slate-600">/</span>
                      <span className={consumed <= prod ? 'text-emerald-400' : 'text-red-400'}>{fmt(consumed)}/m</span>
                    </>
                  ) : (
                    <span className="text-slate-500">{fmt(prod)}/m</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <MachineNodeUtilBar inputs={inputs} rates={rates} incomingSupply={incomingSupply} />
    </div>
  )
}
