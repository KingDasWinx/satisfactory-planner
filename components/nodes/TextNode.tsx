'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { TextNode as TextNodeType } from '@/lib/types'
import { useFactoryStore } from '@/store/factoryStore'

export const TextNode = memo(function TextNode({ id, data, selected }: NodeProps & { data: TextNodeType['data'] }) {
  const setTextNodeContent = useFactoryStore((s) => s.setTextNodeContent)
  const pushHistory = useFactoryStore((s) => s._pushHistory)
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  function startEditing() {
    if (data.locked) return
    pushHistory()
    setEditing(true)
  }

  const text = data.text ?? ''
  const fontSize = data.fontSize ?? 14
  const color = data.color ?? '#e2e8f0'
  const textAlign = data.textAlign ?? 'left'
  const fontWeight = data.fontWeight ?? 400
  const fontStyle = data.italic ? 'italic' : 'normal'
  const textDecoration = data.underline ? 'underline' : 'none'
  const padding = data.padding ?? 12
  const backgroundColor = data.backgroundColor ?? 'rgba(15, 23, 42, 0.8)'
  const borderColor = data.borderColor ?? (selected ? '#fbbf24' : '#475569')
  const autoSizeHeight = data.autoSizeHeight ?? false

  return (
    <div
      className={`min-w-[160px] min-h-[60px] rounded-lg border ${selected ? '' : 'border-dashed'} ${
        data.locked ? '' : 'cursor-text'
      }`}
      style={{ backgroundColor, borderColor, padding }}
      onDoubleClick={startEditing}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={60}
        lineStyle={{ stroke: '#fbbf24', strokeWidth: 1.5 }}
        handleStyle={{
          width: 10,
          height: 10,
          borderRadius: 6,
          background: '#0f172a',
          border: '1.5px solid #fbbf24',
        }}
      />
      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag w-full bg-transparent resize-none outline-none"
          style={{
            fontSize,
            color,
            textAlign,
            fontWeight,
            fontStyle,
            textDecoration,
            minHeight: 40,
            height: autoSizeHeight ? 'auto' : undefined,
          }}
          value={text}
          onChange={(e) => setTextNodeContent(id, e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
            e.stopPropagation()
          }}
          rows={Math.max(2, text.split('\n').length)}
        />
      ) : (
        <p
          className={`whitespace-pre-wrap break-words select-none ${data.locked ? 'cursor-default' : 'cursor-text'}`}
          style={{
            fontSize,
            color,
            textAlign,
            fontWeight,
            fontStyle,
            textDecoration,
            minHeight: 20,
          }}
        >
          {text ||
            (data.locked ? (
              <span className="text-slate-600 italic text-sm">Locked</span>
            ) : (
              <span className="text-slate-600 italic text-sm">Double-click to edit</span>
            ))}
        </p>
      )}
    </div>
  )
})
