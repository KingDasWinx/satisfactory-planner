'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { SplitterNode as SplitterNodeType } from '@/lib/types/store'
import { fmt } from '@/lib/utils/format'

interface SplitterNodeProps extends NodeProps {
  data: SplitterNodeType['data']
}

// Each row is h-8 (32px). Header is h-9 (36px).
// Handle top = header + row_index * rowH + rowH/2
// Expressed as px so it doesn't depend on total node height.
const ROW_H = 32
const HEADER_H = 36
const handleTop = (i: number) => HEADER_H + i * ROW_H + ROW_H / 2

export function SplitterNode({ data, selected }: SplitterNodeProps) {
  const totalIn = data.incomingSupply?.[0] ?? 0
  const outs = data.outgoingDemand ?? []

  // Total demanded by all connected outputs
  const totalDemand = outs.reduce((s, r) => s + (r ?? 0), 0)
  const isStarved = totalDemand > 0 && totalIn < totalDemand - 0.01

  return (
    <div className={`w-44 rounded-lg border bg-slate-900 shadow-lg relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-amber-500/40'}`}>
      {/* Input handle — vertically centred on the whole node */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-0"
        style={{ top: HEADER_H + (ROW_H * 3) / 2, background: '#60a5fa', width: 10, height: 10 }}
      />

      {/* Output handles — each aligned to its own row */}
      {[0, 1, 2].map((i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: handleTop(i), background: '#34d399', width: 10, height: 10 }}
        />
      ))}

      {/* Header */}
      <div className="h-9 bg-amber-500/10 border-b border-amber-500/30 rounded-t-lg px-3 flex items-center gap-2">
        <span className="text-amber-400 font-bold">⑃</span>
        <span className="text-xs font-semibold text-amber-300">Splitter</span>
        {totalIn > 0 && (
          <span
            className={`ml-auto text-[10px] tabular-nums ${isStarved ? 'text-red-400' : 'text-slate-400'}`}
            title={`Entrada: ${fmt(totalIn)}/m${totalDemand > 0 ? ` · Demanda total: ${fmt(totalDemand)}/m` : ''}`}
          >
            {fmt(totalIn)}{isStarved ? `/${fmt(totalDemand)}` : ''}/m
          </span>
        )}
      </div>

      {/* Output rows — h-8 each to match handle positions */}
      {[0, 1, 2].map((i) => {
        const demand = outs[i] ?? 0
        // Actual distributed rate (capped by available supply)
        const distributed = totalDemand > 0
          ? Math.min(demand, totalIn * (demand / totalDemand))
          : 0
        const isBelowDemand = demand > 0 && distributed < demand - 0.01
        return (
          <div key={i} className="h-8 flex items-center justify-end px-3 border-t border-slate-800/60">
            {totalIn > 0 && demand > 0 ? (
              <span
                className={`text-[10px] tabular-nums ${isBelowDemand ? 'text-red-400' : 'text-emerald-400'}`}
                title={`Saída ${i}: distribuído ${fmt(distributed)}/m · demanda ${fmt(demand)}/m`}
              >
                {fmt(distributed)}/{fmt(demand)}/m
              </span>
            ) : (
              <span className="text-[10px] text-slate-400" title={totalIn > 0 ? `Saída ${i}: ${fmt(distributed)}/m` : 'Sem entrada'}>
                {totalIn > 0 ? `${fmt(distributed)}/m` : '—'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
