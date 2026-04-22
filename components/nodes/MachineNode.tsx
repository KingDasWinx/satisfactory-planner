'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useFactoryStore, type MachineNodeData } from '@/store/factoryStore'
import { useMultiMachines } from '@/lib/gameDataContext'
import { calcNodeRates } from '@/lib/flowCalc'
import type { ParsedRecipe } from '@/lib/gameData'

export function fmt(n: number): string {
  if (n === 0) return '0'
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (Number.isInteger(n) || n >= 100) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

function UtilisationBar({
  inputs,
  rates,
  incomingSupply,
}: {
  inputs: { part: string; amount: number }[]
  rates: { inputs: number[] }
  incomingSupply?: number[]
}) {
  if (inputs.length === 0 || !incomingSupply) return null

  // Efficiency per input: how much of its capacity is being fed
  const efficiencies = inputs.map((_, i) => {
    const demand = rates.inputs[i] ?? 0
    const supply = incomingSupply[i] ?? 0
    if (demand === 0 || supply === 0) return null
    return Math.min(supply / demand, 1) // cap at 1.0 (overclock scenario)
  }).filter((e): e is number => e !== null)

  if (efficiencies.length === 0) return null

  // Bottleneck = minimum efficiency across all inputs
  const efficiency = Math.min(...efficiencies)
  const pct = Math.round(efficiency * 100)

  // Color: green ≥ 100%, amber 50–99%, red < 50%
  const barColor = efficiency >= 1 ? '#22c55e' : efficiency >= 0.5 ? '#f59e0b' : '#ef4444'
  const textColor = efficiency >= 1 ? 'text-emerald-400' : efficiency >= 0.5 ? 'text-amber-400' : 'text-red-400'

  return (
    <div
      className="mt-1.5"
      title={`Utilização: ${pct}% da capacidade de produção está sendo alimentada`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-slate-500">Utilização</span>
        <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

function ConfigPopup({
  id,
  data,
  anchorRect,
  onClose,
}: {
  id: string
  data: MachineNodeData
  anchorRect: DOMRect
  onClose: () => void
}) {
  const { machine, recipe, availableRecipes, nMachines, clockSpeed, minerVariant, minerCapacity } = data
  const setRecipe = useFactoryStore((s) => s.setRecipe)
  const setNodeConfig = useFactoryStore((s) => s.setNodeConfig)
  const multiMachines = useMultiMachines()

  const multiMachine = multiMachines.find((mm) => mm.machines.some((v) => v.name === machine.name))
  const currentMinerVariant = minerVariant ?? multiMachine?.machines.find((v) => v.isDefault)?.name ?? multiMachine?.machines[0]?.name
  const currentMinerCapacity = minerCapacity ?? multiMachine?.capacities.find((c) => c.isDefault)?.name ?? multiMachine?.capacities[0]?.name

  const top = anchorRect.bottom + 8
  const left = anchorRect.right + 8

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 p-3 space-y-3"
        style={{ top, left }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400">{machine.name}</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>

        {/* Recipe picker */}
        {availableRecipes.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Receita</p>
            <div className="rounded border border-slate-700 bg-slate-800 max-h-36 overflow-y-auto">
              {availableRecipes.map((r: ParsedRecipe) => (
                <button
                  key={r.name}
                  onClick={() => setRecipe(id, r)}
                  className={`w-full text-left px-2 py-1 text-xs hover:bg-slate-700 ${r.name === recipe.name ? 'text-amber-400' : 'text-slate-300'}`}
                >
                  {r.alternate && <span className="text-purple-400 mr-1">★</span>}
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Miner variant + capacity */}
        {multiMachine && multiMachine.machines.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">Tipo de mineradora</p>
            <div className="flex gap-1.5">
              <select
                value={currentMinerVariant}
                onChange={(e) => setNodeConfig(id, { minerVariant: e.target.value })}
                className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {multiMachine.machines.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </select>
              {multiMachine.capacities.length > 0 && (
                <select
                  value={currentMinerCapacity}
                  onChange={(e) => setNodeConfig(id, { minerCapacity: e.target.value })}
                  className="flex-1 text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {multiMachine.capacities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* nMachines + clockSpeed */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500">Quantidade e clock</p>
          <div className="flex gap-1.5 items-center">
            <label className="text-xs text-slate-500 shrink-0 w-8">Qtd</label>
            <input
              type="number" min={1} max={999} value={nMachines}
              onChange={(e) => setNodeConfig(id, { nMachines: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            <label className="text-xs text-slate-500 shrink-0 w-8">Clock</label>
            <input
              type="number" min={1} max={250} value={Math.round(clockSpeed * 100)}
              onChange={(e) => setNodeConfig(id, { clockSpeed: Math.max(0.01, Math.min(2.5, (parseInt(e.target.value) || 100) / 100)) })}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-500 shrink-0">%</span>
          </div>
        </div>

      </div>
    </>,
    document.body
  )
}

function MachineNodeComponent({ id, data, selected }: NodeProps & { data: MachineNodeData }) {
  const { machine, recipe, availableRecipes, nMachines, clockSpeed, incomingSupply, outgoingDemand } = data
  const setRecipe = useFactoryStore((s) => s.setRecipe)
  const multiMachines = useMultiMachines()
  const isExtractor = multiMachines.some((mm) => mm.machines.some((v) => v.name === machine.name))
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [configAnchor, setConfigAnchor] = useState<DOMRect | null>(null)
  const configBtnRef = useRef<HTMLButtonElement>(null)
  const [editingOutput, setEditingOutput] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const setNodeConfig = useFactoryStore((s) => s.setNodeConfig)

  function startEditOutput(i: number, currentVal: number) {
    setEditingOutput(i)
    setEditingValue(String(currentVal))
    setTimeout(() => { editInputRef.current?.select() }, 0)
  }

  function commitEditOutput() {
    if (editingOutput === null) return
    const n = parseFloat(editingValue)
    setNodeConfig(id, { outputRateOverride: isNaN(n) || editingValue === '' ? undefined : Math.max(0, n) })
    setEditingOutput(null)
  }

  function cancelEditOutput() {
    setEditingOutput(null)
  }

  useEffect(() => {
    if (editingOutput !== null) editInputRef.current?.focus()
  }, [editingOutput])

  const inputs = recipe?.inputs ?? []
  const outputs = recipe?.outputs ?? []
  const handleCount = Math.max(inputs.length, outputs.length, 1)

  const rates = calcNodeRates(data, multiMachines)

  return (
    <div className={`min-w-[240px] rounded-lg border bg-slate-900 shadow-xl shadow-black/50 relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-amber-500/40'}`}>
      {inputs.map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: `${((i + 1) / (handleCount + 1)) * 100}%` }}
          className="!w-3 !h-3 !bg-blue-500 !border-blue-300 hover:!bg-blue-400 cursor-pointer"
        />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-lg bg-amber-500/20 px-3 py-2 border-b border-amber-500/30">
        <span className="text-amber-400 text-base">⚙</span>
        <span className="text-sm font-semibold text-amber-200 truncate">{machine.name}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {machine.averagePower > 0 && (
            <span className="text-xs text-slate-400">
              {fmt(machine.averagePower * nMachines * Math.pow(clockSpeed, 1.322))} MW
            </span>
          )}
          <button
            ref={configBtnRef}
            onClick={(e) => {
              e.stopPropagation()
              setConfigAnchor(configAnchor ? null : configBtnRef.current?.getBoundingClientRect() ?? null)
            }}
            className="text-slate-400 hover:text-amber-400 text-xs leading-none px-1"
            title="Configurações"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Config popup — rendered via portal so it's always above all nodes */}
      {configAnchor && (
        <ConfigPopup id={id} data={data} anchorRect={configAnchor} onClose={() => setConfigAnchor(null)} />
      )}

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {recipe ? (
          <>
            {/* Recipe name + qty badge */}
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

            {/* Inputs / Outputs with live supply/demand values */}
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
                  const isEditing = editingOutput === i
                  return (
                    <div key={i} className="flex flex-col gap-0">
                      <div className="flex items-center gap-1 text-emerald-300">
                        <span className="text-emerald-500 shrink-0">←</span>
                        <span className="truncate">{out.part}</span>
                      </div>
                      <div className="flex items-center gap-1 pl-3 tabular-nums">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="number"
                            min={0}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEditOutput}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditOutput()
                              if (e.key === 'Escape') cancelEditOutput()
                            }}
                            className="w-16 bg-slate-800 border border-amber-500/60 rounded px-1 text-[11px] text-amber-300 tabular-nums focus:outline-none nodrag"
                          />
                        ) : isExtractor ? (
                          <span
                            className="text-slate-400 cursor-text hover:text-amber-300 hover:underline decoration-dotted underline-offset-2 transition-colors"
                            title="Clique para editar"
                            onClick={(e) => { e.stopPropagation(); startEditOutput(i, prod) }}
                          >
                            {fmt(prod)}/m
                          </span>
                        ) : consumed !== undefined ? (
                          <>
                            <span className="text-slate-400">{fmt(prod)}</span>
                            <span className="text-slate-600">/</span>
                            <span className={consumed <= prod ? 'text-emerald-400' : 'text-red-400'}>{fmt(consumed)}/m</span>
                          </>
                        ) : (
                          <span className="text-slate-500">{fmt(prod)}/m</span>
                        )}
                        {isExtractor && !isEditing && consumed !== undefined && (
                          <>
                            <span className="text-slate-600">/</span>
                            <span className={consumed <= prod ? 'text-emerald-400' : 'text-red-400'}>{fmt(consumed)}/m</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Utilisation bar — only shown when there are connected inputs */}
            <UtilisationBar inputs={inputs} rates={rates} incomingSupply={incomingSupply} />
          </>
        ) : (
          <span className="text-xs text-slate-500 italic">Sem receita disponível</span>
        )}
      </div>

      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: `${((i + 1) / (handleCount + 1)) * 100}%` }}
          className="!w-3 !h-3 !bg-emerald-500 !border-emerald-300 hover:!bg-emerald-400 cursor-pointer"
        />
      ))}
    </div>
  )
}

export const MachineNode = memo(MachineNodeComponent)
