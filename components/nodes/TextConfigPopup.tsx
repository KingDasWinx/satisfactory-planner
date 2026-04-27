'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { clamp, isLikelyCssColor } from '@/lib/utils/textStyle'
import { useFactoryStore } from '@/store/factoryStore'
import type { TextNodeData } from '@/lib/types'

interface TextConfigPopupProps {
  id: string
  data: TextNodeData
  anchorRect: DOMRect
  onClose: () => void
}

const POPUP_W = 320
const POPUP_H = 420
const GAP = 8

export function TextConfigPopup({ id, data, anchorRect, onClose }: TextConfigPopupProps) {
  const setTextNodeStyle = useFactoryStore((s) => s.setTextNodeStyle)
  const resetTextNodeStyle = useFactoryStore((s) => s.resetTextNodeStyle)

  const [colorDraft, setColorDraft] = useState(data.color ?? '')
  const [bgDraft, setBgDraft] = useState(data.backgroundColor ?? '')

  useEffect(() => setColorDraft(data.color ?? ''), [data.color])
  useEffect(() => setBgDraft(data.backgroundColor ?? ''), [data.backgroundColor])

  const pos = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    const rawLeft = anchorRect.right + GAP
    const rawTop = anchorRect.bottom + GAP

    const left = clamp(rawLeft, GAP, Math.max(GAP, vw - POPUP_W - GAP))
    const top = clamp(rawTop, GAP, Math.max(GAP, vh - POPUP_H - GAP))

    return { left, top }
  }, [anchorRect])

  const fontSize = data.fontSize ?? 14
  const padding = data.padding ?? 12
  const textAlign = data.textAlign ?? 'left'
  const bold = (data.fontWeight ?? 400) >= 600
  const italic = data.italic ?? false
  const underline = data.underline ?? false
  const locked = data.locked ?? false
  const autoSizeHeight = data.autoSizeHeight ?? false

  function commitColor(next: string) {
    const v = next.trim()
    if (!v) {
      setTextNodeStyle(id, { color: undefined })
      return
    }
    if (isLikelyCssColor(v)) setTextNodeStyle(id, { color: v })
  }

  function commitBackground(next: string) {
    const v = next.trim()
    if (!v) {
      setTextNodeStyle(id, { backgroundColor: undefined })
      return
    }
    if (isLikelyCssColor(v)) setTextNodeStyle(id, { backgroundColor: v })
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-[320px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 p-3 space-y-3"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400">Texto</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Tamanho</span>
              <input
                type="number"
                min={8}
                max={72}
                step={1}
                value={fontSize}
                onChange={(e) => setTextNodeStyle(id, { fontSize: Math.max(8, Math.min(72, parseInt(e.target.value) || 14)) })}
                className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs text-slate-500">Padding</span>
              <input
                type="number"
                min={0}
                max={48}
                step={1}
                value={padding}
                onChange={(e) => setTextNodeStyle(id, { padding: Math.max(0, Math.min(48, parseInt(e.target.value) || 0)) })}
                className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs text-slate-500">Cor do texto</span>
            <input
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
              onBlur={() => commitColor(colorDraft)}
              placeholder="#e2e8f0"
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-500">Fundo</span>
            <input
              value={bgDraft}
              onChange={(e) => setBgDraft(e.target.value)}
              onBlur={() => commitBackground(bgDraft)}
              placeholder="rgba(15, 23, 42, 0.8)"
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-500">Alinhamento</span>
            <select
              value={textAlign}
              onChange={(e) => setTextNodeStyle(id, { textAlign: e.target.value as TextNodeData['textAlign'] })}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTextNodeStyle(id, { fontWeight: bold ? undefined : 700 })}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                bold
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40'
              }`}
            >
              Negrito
            </button>
            <button
              onClick={() => setTextNodeStyle(id, { italic: !italic })}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                italic
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40'
              }`}
            >
              Itálico
            </button>
            <button
              onClick={() => setTextNodeStyle(id, { underline: !underline })}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                underline
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40'
              }`}
            >
              Sublinhado
            </button>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">Bloquear edição (duplo clique)</span>
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setTextNodeStyle(id, { locked: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300">Altura automática</span>
              <input
                type="checkbox"
                checked={autoSizeHeight}
                onChange={(e) => setTextNodeStyle(id, { autoSizeHeight: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => resetTextNodeStyle(id)}
            className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40"
            title="Remove as personalizações e volta ao padrão"
          >
            Resetar estilo
          </button>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40"
          >
            Fechar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

