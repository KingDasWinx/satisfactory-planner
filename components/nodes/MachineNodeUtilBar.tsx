'use client'

import type { NodeRates } from '@/lib/types/flow'
import type { Ingredient } from '@/lib/types/game'

interface MachineNodeUtilBarProps {
  inputs: Ingredient[]
  rates: NodeRates
  incomingSupply?: number[]
}

export function MachineNodeUtilBar({ inputs, rates, incomingSupply }: MachineNodeUtilBarProps) {
  if (inputs.length === 0 || !incomingSupply) return null

  const efficiencies = inputs.map((_, i) => {
    const demand = rates.inputs[i] ?? 0
    const supply = incomingSupply[i] ?? 0
    if (demand === 0 || supply === 0) return null
    return Math.min(supply / demand, 1)
  }).filter((e): e is number => e !== null)

  if (efficiencies.length === 0) return null

  const efficiency = Math.min(...efficiencies)
  const pct = Math.round(efficiency * 100)

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
