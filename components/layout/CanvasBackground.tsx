'use client'

import { Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react'

export function CanvasBackground() {
  return (
    <>
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2330" />
      <Controls className="[&>button]:bg-slate-800 [&>button]:border-slate-600 [&>button]:text-slate-300 [&>button:hover]:bg-slate-700" />
      <MiniMap
        className="!bg-slate-900 !border-slate-700"
        nodeColor="#f59e0b"
        maskColor="rgba(0,0,0,0.6)"
      />
    </>
  )
}
