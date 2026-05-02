'use client'

import { createPortal } from 'react-dom'
import { useFactoryStore } from '@/store/factoryStore'
import { useMultiMachines } from '@/lib/hooks/useMultiMachines'
import type { MachineNodeData } from '@/lib/types/store'
import type { ParsedRecipe } from '@/lib/types/game'

interface ConfigPopupProps {
  id: string
  data: MachineNodeData
  anchorRect: DOMRect
  onClose: () => void
}

export function ConfigPopup({ id, data, anchorRect, onClose }: ConfigPopupProps) {
  const { machine, recipe, availableRecipes, nMachines, autoLocked, autoNMachines, clockSpeed, minerVariant, minerCapacity } = data
  const setRecipe = useFactoryStore((s) => s.setRecipe)
  const setNodeConfig = useFactoryStore((s) => s.setNodeConfig)
  const rescaleUpstream = useFactoryStore((s) => s.rescaleUpstream)
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

        <div className="space-y-1">
          <p className="text-xs text-slate-500">Quantidade e clock</p>
          <div className="flex gap-1.5 items-center">
            <label className="text-xs text-slate-500 shrink-0 w-8">Qtd</label>
            <input
              type="number"
              min={0.01}
              max={999}
              step={0.01}
              value={nMachines}
              onChange={(e) => rescaleUpstream(id, Math.max(0.01, parseFloat(e.target.value) || 1))}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          {autoLocked && (
            <div className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1 space-y-1">
              <div className="text-[10px] text-slate-400">
                Travado (manual) — a quantidade não muda automaticamente.
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setNodeConfig(id, { __unlockAuto: true })}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/60 hover:text-amber-200"
                  title="Destrava e volta a ajustar em cadeia nas próximas atualizações"
                >
                  Reativar auto
                </button>
                <button
                  onClick={() => {
                    const rec = autoNMachines ?? nMachines
                    setNodeConfig(id, { nMachines: rec, __fromAuto: true, __unlockAuto: true })
                  }}
                  disabled={autoNMachines === undefined}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/60 hover:text-amber-200 disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-200"
                  title={autoNMachines === undefined ? 'Sem recomendado disponível agora' : 'Aplica o recomendado atual e destrava'}
                >
                  Resetar p/ recomendado
                </button>
              </div>
            </div>
          )}
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
