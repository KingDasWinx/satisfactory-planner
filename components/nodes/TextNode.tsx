'use client'

import { memo, useState, useRef, useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
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
    pushHistory()
    setEditing(true)
  }

  const fontSize = data.fontSize ?? 14
  const color = data.color ?? '#e2e8f0'

  return (
    <div
      className={`min-w-[160px] min-h-[60px] rounded-lg border bg-slate-900/80 p-3 ${
        selected ? 'border-amber-400' : 'border-dashed border-slate-600'
      }`}
      onDoubleClick={startEditing}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag w-full bg-transparent resize-none outline-none"
          style={{ fontSize, color, minHeight: 40 }}
          value={data.text}
          onChange={(e) => setTextNodeContent(id, e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false)
            e.stopPropagation()
          }}
          rows={Math.max(2, data.text.split('\n').length)}
        />
      ) : (
        <p
          className="whitespace-pre-wrap break-words cursor-text select-none"
          style={{ fontSize, color, minHeight: 20 }}
        >
          {data.text || <span className="text-slate-600 italic text-sm">Duplo clique para editar</span>}
        </p>
      )}
    </div>
  )
})
