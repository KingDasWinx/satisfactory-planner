'use client'

import type { FlowViewport, HelperGuideLine, HelperSpacingGuide } from '@/lib/types'

type RenderLine =
  | { kind: 'align-x'; x: number; y0: number; y1: number; label?: string }
  | { kind: 'align-y'; y: number; x0: number; x1: number; label?: string }
  | { kind: 'space-x'; x0: number; x1: number; y: number; label: string }
  | { kind: 'space-y'; y0: number; y1: number; x: number; label: string }

interface HelperLinesOverlayProps {
  viewport: FlowViewport
  guides: HelperGuideLine[]
  spacing: HelperSpacingGuide[]
}

function flowToScreenX(x: number, vp: FlowViewport) {
  return x * vp.zoom + vp.x
}
function flowToScreenY(y: number, vp: FlowViewport) {
  return y * vp.zoom + vp.y
}

export function HelperLinesOverlay({ viewport, guides, spacing }: HelperLinesOverlayProps) {
  if (guides.length === 0 && spacing.length === 0) return null

  const lines: RenderLine[] = []

  // Alignment guide lines: draw across a large span; we keep them simple here.
  for (const g of guides) {
    if (g.axis === 'x') {
      lines.push({ kind: 'align-x', x: g.position, y0: -10_000, y1: 10_000 })
    } else {
      lines.push({ kind: 'align-y', y: g.position, x0: -10_000, x1: 10_000 })
    }
  }

  for (const s of spacing) {
    if (s.axis === 'x') {
      lines.push({ kind: 'space-x', x0: s.x0, x1: s.x1, y: s.y, label: `${s.gap}px` })
    } else {
      lines.push({ kind: 'space-y', y0: s.y0, y1: s.y1, x: s.x, label: `${s.gap}px` })
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {lines.map((l, idx) => {
        if (l.kind === 'align-x') {
          const left = flowToScreenX(l.x, viewport)
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-px bg-amber-400/70"
              style={{ left }}
            />
          )
        }
        if (l.kind === 'align-y') {
          const top = flowToScreenY(l.y, viewport)
          return (
            <div
              key={idx}
              className="absolute left-0 right-0 h-px bg-amber-400/70"
              style={{ top }}
            />
          )
        }
        if (l.kind === 'space-x') {
          const x0 = flowToScreenX(l.x0, viewport)
          const x1 = flowToScreenX(l.x1, viewport)
          const y = flowToScreenY(l.y, viewport)
          const left = Math.min(x0, x1)
          const width = Math.abs(x1 - x0)
          return (
            <div key={idx} className="absolute" style={{ left, top: y }}>
              <div className="absolute -translate-y-1/2 h-px bg-slate-300/60" style={{ width }} />
              <div className="absolute -translate-y-1/2 -translate-x-1/2 left-1/2 -top-3 rounded bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200">
                {l.label}
              </div>
            </div>
          )
        }
        // space-y
        const y0 = flowToScreenY(l.y0, viewport)
        const y1 = flowToScreenY(l.y1, viewport)
        const x = flowToScreenX(l.x, viewport)
        const top = Math.min(y0, y1)
        const height = Math.abs(y1 - y0)
        return (
          <div key={idx} className="absolute" style={{ left: x, top }}>
            <div className="absolute -translate-x-1/2 w-px bg-slate-300/60" style={{ height }} />
            <div className="absolute -translate-x-1/2 -translate-y-1/2 left-0 top-1/2 -ml-6 rounded bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200">
              {l.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

