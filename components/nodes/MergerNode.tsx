'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MergerNode as MergerNodeType } from '@/lib/types/store'
import { fmt } from '@/lib/utils/format'

interface MergerNodeProps extends NodeProps {
  data: MergerNodeType['data']
}

const ROW_H = 32
const HEADER_H = 36
const handleTop = (i: number) => HEADER_H + i * ROW_H + ROW_H / 2

export function MergerNode({ data, selected }: MergerNodeProps) {
  const ins = data.incomingSupply ?? []
  const totalOut = ins.reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className={`w-44 rounded-lg border bg-slate-900 shadow-lg relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-emerald-500/40'}`}>
      {/* Input handles — each aligned to its own row */}
      {[0, 1, 2].map((i) => (
        <Handle
          key={i}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: handleTop(i), background: '#60a5fa', width: 10, height: 10 }}
        />
      ))}

      {/* Output handle — vertically centred on the whole node */}
      <Handle
        type="source"
        position={Position.Right}
        id="out-0"
        style={{ top: HEADER_H + (ROW_H * 3) / 2, background: '#34d399', width: 10, height: 10 }}
      />

      {/* Header */}
      <div className="h-9 bg-emerald-500/10 border-b border-emerald-500/30 rounded-t-lg px-3 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">⑄</span>
        <span className="text-xs font-semibold text-emerald-300">Merger</span>
        {totalOut > 0 && (
          <span className="ml-auto text-[10px] text-slate-400">{fmt(totalOut)}/m</span>
        )}
      </div>

      {/* Input rows — h-8 each to match handle positions */}
      {[0, 1, 2].map((i) => {
        const rate = ins[i] ?? 0
        return (
          <div key={i} className="h-8 flex items-center px-3 border-t border-slate-800/60">
            <span className="text-[10px] text-slate-400">
              {rate > 0 ? `${fmt(rate)}/m` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
