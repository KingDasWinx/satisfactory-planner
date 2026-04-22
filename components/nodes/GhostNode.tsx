'use client'

import { useFactoryStore } from '@/store/factoryStore'

export function GhostNode() {
  const clipboard = useFactoryStore((s) => s.clipboard)
  const isGhostActive = useFactoryStore((s) => s.isGhostActive)
  // ghostScreenPosition está em coordenadas de TELA — correto para renderização CSS absoluta
  const ghostScreenPosition = useFactoryStore((s) => s.ghostScreenPosition)
  // ghostPosition está em coordenadas de FLOW — usado apenas para calcular o offset visual
  const ghostPosition = useFactoryStore((s) => s.ghostPosition)

  if (!isGhostActive || !clipboard) return null

  // Offset em flow coords aplicado aos nós do clipboard
  const flowOffset = {
    x: ghostPosition.x - clipboard.centroid.x,
    y: ghostPosition.y - clipboard.centroid.y,
  }

  // A posição de cada nó no clipboard está em flow coords.
  // Precisamos saber a diferença em screen coords de cada nó em relação ao centroid.
  // Para isso usamos o fato de que o centroid (em flow) mapeia para ghostScreenPosition (em screen).
  // Cada nó tem (node.position - centroid) de diferença em flow coords, mas renderizamos em screen
  // coords — por isso precisamos do rfInstance para converter. Como não temos rfInstance aqui,
  // armazenamos a posição de tela do centroid e usamos a diferença em pixels diretamente.
  // Nota: isso assume escala 1:1 para o offset relativo entre nós, o que é aproximado.
  // A posição exata do ghost segue o mouse via ghostScreenPosition.
  const centroidScreenX = ghostScreenPosition.x
  const centroidScreenY = ghostScreenPosition.y

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {clipboard.nodes.map((node) => {
        // Diferença de posição do nó em relação ao centroid (em flow coords)
        const deltaX = node.position.x - clipboard.centroid.x
        const deltaY = node.position.y - clipboard.centroid.y

        return (
          <div
            key={node.id}
            className="absolute min-w-[240px] rounded-lg border-2 border-dashed border-amber-400/60 bg-slate-900/50 shadow-lg pointer-events-none"
            style={{
              left: `${centroidScreenX + deltaX}px`,
              top: `${centroidScreenY + deltaY}px`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.55,
            }}
          >
            <div className="h-10 bg-amber-500/15 border-b border-amber-400/30 rounded-t px-3 py-2 flex items-center gap-2">
              <span className="text-amber-400 text-sm">
                {node.type === 'splitterNode' ? '⑃' : node.type === 'mergerNode' ? '⑄' : '⚙'}
              </span>
              <span className="text-xs font-semibold text-amber-200/80 truncate">
                {node.type === 'splitterNode' ? 'Splitter' : node.type === 'mergerNode' ? 'Merger' : (node.data as { machine?: { name: string } }).machine?.name ?? '—'}
              </span>
            </div>
            <div className="px-3 py-2 h-10 flex items-center">
              <span className="text-[10px] text-slate-400/60 italic">
                {node.type === 'machineNode' ? ((node.data as { recipe?: { name: string } }).recipe?.name ?? '—') : null}
              </span>
            </div>
          </div>
        )
      })}
      <div
        className="absolute text-[10px] text-amber-400/70 pointer-events-none select-none"
        style={{
          left: `${centroidScreenX}px`,
          top: `${centroidScreenY + 40}px`,
          transform: 'translateX(-50%)',
        }}
      >
        Clique para colar · Esc para cancelar
      </div>
    </div>
  )
}
