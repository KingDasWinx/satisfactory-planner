'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { FrameNode as FrameNodeType } from '@/lib/types'
import { useFactoryStore } from '@/store/factoryStore'

export const FrameNode = memo(function FrameNode({ id, data, selected }: NodeProps & { data: FrameNodeType['data'] }) {
  const setFrameNodeLabel = useFactoryStore((s) => s.setFrameNodeLabel)
  const setFrameNodeLocked = useFactoryStore((s) => s.setFrameNodeLocked)
  const pushHistory = useFactoryStore((s) => s._pushHistory)
  const [editingLabel, setEditingLabel] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingLabel && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingLabel])

  function startEditingLabel() {
    pushHistory()
    setEditingLabel(true)
  }

  const borderColor = data.color ?? '#f59e0b'
  const locked = data.locked ?? false

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={100}
        lineStyle={{ borderColor }}
        handleStyle={{ borderColor, background: '#1e293b' }}
      />

      {/* Header — único elemento com pointer-events; clicável para drag e interação */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 py-1.5 select-none rounded-t-lg"
        style={{ borderBottom: `1px solid ${borderColor}30`, background: `${borderColor}12` }}
        onDoubleClick={() => !locked && startEditingLabel()}
      >
        {editingLabel ? (
          <input
            ref={inputRef}
            className="nodrag flex-1 bg-transparent outline-none text-sm font-semibold"
            style={{ color: borderColor }}
            value={data.label}
            onChange={(e) => setFrameNodeLabel(id, e.target.value)}
            onBlur={() => setEditingLabel(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(false)
              e.stopPropagation()
            }}
          />
        ) : (
          <span className="flex-1 text-sm font-semibold truncate" style={{ color: borderColor }}>
            {data.label || 'Area'}
          </span>
        )}

        {/* Cadeado — só visível quando selecionado ou travado */}
        {(selected || locked) && (
          <button
            className="nodrag flex-shrink-0 rounded p-0.5 transition-colors hover:bg-white/10"
            title={locked ? 'Unlocked: items inside move independently' : 'Locked: dragging the frame moves items inside'}
            onClick={(e) => {
              e.stopPropagation()
              setFrameNodeLocked(id, !locked)
            }}
          >
            {locked ? (
              // Cadeado fechado
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="8" rx="1.5" fill={borderColor} />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke={borderColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <circle cx="8" cy="11" r="1.2" fill="#0f1117" />
              </svg>
            ) : (
              // Cadeado aberto
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="8" rx="1.5" fill="none" stroke={borderColor} strokeWidth="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0" stroke={borderColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <circle cx="8" cy="11" r="1.2" fill={borderColor} />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Corpo — pointer-events none para não bloquear interação com nós/arestas por baixo */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          border: `2px dashed ${borderColor}${locked ? 'cc' : '66'}`,
          background: `${borderColor}06`,
          // Adiciona padding-top para não sobrepor o header
          paddingTop: 30,
        }}
      />
    </>
  )
})
