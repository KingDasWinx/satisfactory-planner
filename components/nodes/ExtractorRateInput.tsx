'use client'

import { useRef } from 'react'
import { fmt } from '@/lib/utils/format'

interface ExtractorRateInputProps {
  value: number
  editing: boolean
  editingValue: string
  onStartEdit: (currentVal: number) => void
  onChangeValue: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}

export function ExtractorRateInput({
  value,
  editing,
  editingValue,
  onStartEdit,
  onChangeValue,
  onCommit,
  onCancel,
}: ExtractorRateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={editingValue}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        className="w-16 bg-slate-800 border border-amber-500/60 rounded px-1 text-[11px] text-amber-300 tabular-nums focus:outline-none nodrag"
      />
    )
  }

  return (
    <span
      className="text-slate-400 cursor-text hover:text-amber-300 hover:underline decoration-dotted underline-offset-2 transition-colors"
      title="Clique para editar"
      onClick={(e) => { e.stopPropagation(); onStartEdit(value) }}
    >
      {fmt(value)}/m
    </span>
  )
}
