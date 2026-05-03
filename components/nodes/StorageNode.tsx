'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { StorageNode as StorageNodeType } from '@/lib/types/store'
import { STORAGE_ICON_SRC } from '@/lib/constants/logisticsIcons'
import { fmt } from '@/lib/utils/format'

interface StorageNodeProps extends NodeProps {
  data: StorageNodeType['data']
}

export function StorageNode({ data, selected }: StorageNodeProps) {
  const [hideIcon, setHideIcon] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const totalIn = data.incomingSupply?.[0] ?? 0
  const inByPart = data.incomingRatesByPart ?? {}
  const outByPart = data.outgoingRatesByPart ?? {}
  const allParts = Array.from(new Set([...Object.keys(inByPart), ...Object.keys(outByPart)]))
  // Sum actual output per part (what really exits, not what is demanded)
  const totalOut = Object.values(outByPart).reduce((s, v) => s + v, 0)
  const balance = totalIn - totalOut

  const balanceColor =
    balance > 0.01 ? 'text-emerald-400' :
    balance < -0.01 ? 'text-red-400' :
    'text-amber-400'

  const hasData = totalIn > 0 || totalOut > 0

  return (
    <div className={`w-52 rounded-lg border bg-slate-900 shadow-lg relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-amber-500/40'}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in-0"
        style={{ top: '50%', background: '#60a5fa', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-0"
        style={{ top: '50%', background: '#34d399', width: 10, height: 10 }}
      />

      {/* Header */}
      <div className="h-9 bg-amber-500/10 border-b border-amber-500/30 rounded-t-lg px-3 flex items-center gap-2">
        {!hideIcon ? (
          <img
            src={STORAGE_ICON_SRC}
            alt=""
            className="h-7 w-7 shrink-0 object-contain"
            draggable={false}
            onError={() => setHideIcon(true)}
          />
        ) : (
          <span className="text-amber-400 w-7 shrink-0 text-center text-xs">▤</span>
        )}
        <span className="text-xs font-semibold text-amber-300">Storage</span>
      </div>

      {/* Linha resumo: entrada / saída / saldo */}
      {hasData && (
        <div className="px-3 py-2 flex items-center gap-2 text-[10px] tabular-nums border-b border-slate-800/60">
          <span className="text-blue-300" title={`Total input: ${fmt(totalIn)}/min`}>↓ {fmt(totalIn)}/m</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-300" title={`Total output: ${fmt(totalOut)}/min`}>↑ {fmt(totalOut)}/m</span>
          <span className="text-slate-600">·</span>
          <span
            className={balanceColor}
            title={`Balance (in - out): ${balance > 0 ? '+' : ''}${fmt(balance)}/min`}
          >
            {balance > 0 ? '+' : ''}{fmt(balance)}
          </span>
        </div>
      )}

      {/* Toggle painel de materiais */}
      {allParts.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>{allParts.length} item{allParts.length !== 1 ? 's' : ''}</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="border-t border-slate-800/60 rounded-b-lg overflow-hidden">
              {/* Cabeçalho colunas */}
              <div className="flex items-center justify-between px-3 py-1 text-[9px] text-slate-600 uppercase tracking-wide border-b border-slate-800/60">
                <span>Item</span>
                <div className="flex gap-3">
                  <span className="w-12 text-right">in</span>
                  <span className="w-12 text-right">out</span>
                </div>
              </div>
              {allParts.map((part) => {
                const inRate = inByPart[part] ?? 0
                const outRate = outByPart[part] ?? 0
                const deficit = outRate > inRate + 0.01
                return (
                  <div key={part} className="flex items-center justify-between px-3 py-1.5 text-[10px] border-t border-slate-800/40">
                    <span className="text-slate-300 truncate mr-2">{part}</span>
                    <div className="flex gap-3 shrink-0 tabular-nums">
                      <span className="w-12 text-right text-blue-300" title={`Input ${part}: ${fmt(inRate)}/min`}>{fmt(inRate)}</span>
                      <span className={`w-12 text-right ${deficit ? 'text-red-400' : 'text-emerald-400'}`} title={`Output ${part}: ${fmt(outRate)}/min`}>{fmt(outRate)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Estado vazio */}
      {!hasData && allParts.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-slate-600 text-center">
          No connections
        </div>
      )}
    </div>
  )
}
