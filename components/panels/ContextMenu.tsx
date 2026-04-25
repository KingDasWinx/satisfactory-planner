'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import { exportConnectedFlow, exportConnectedFlowCompact } from '@/lib/utils/exportFlow'

const MARGIN = 12

export function ContextMenu() {
  const menu = useFactoryStore((s) => s.menu)
  const closeMenu = useFactoryStore((s) => s.closeMenu)
  const openMenu = useFactoryStore((s) => s.openMenu)
  const runMagicPlanner = useFactoryStore((s) => s.runMagicPlanner)
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeMenu])

  useLayoutEffect(() => {
    if (!menu || (menu.type !== 'context' && menu.type !== 'nodeContext') || !menuRef.current) return
    const el = menuRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = menu.position.x
    let y = menu.position.y
    if (x + rect.width + MARGIN > vw) x = vw - rect.width - MARGIN
    if (y + rect.height + MARGIN > vh) y = vh - rect.height - MARGIN
    if (x < MARGIN) x = MARGIN
    if (y < MARGIN) y = MARGIN

    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.visibility = 'visible'
  })

  if (!menu) return null
  if (menu.type !== 'context' && menu.type !== 'nodeContext') return null

  const isNode = menu.type === 'nodeContext'

  function actionAddRecipe() {
    if (!menu || menu.type !== 'context') return
    openMenu({ type: 'canvas', position: menu.position, flowPosition: menu.flowPosition })
  }

  function actionMagic() {
    if (!menu || menu.type !== 'nodeContext') return
    runMagicPlanner(menu.nodeId, menu.position)
  }

  async function actionCopyFlow() {
    if (!menu || menu.type !== 'nodeContext') return
    const payload = exportConnectedFlow(nodes, edges, menu.nodeId)
    const text = JSON.stringify(payload, null, 2)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback: open a prompt so the user can copy manually
      window.prompt('Copie o JSON do fluxo:', text)
    }
    closeMenu()
  }

  async function actionCopyFlowCompact() {
    if (!menu || menu.type !== 'nodeContext') return
    const payload = exportConnectedFlowCompact(nodes, edges, menu.nodeId)
    const text = JSON.stringify(payload) // minificado para ficar bem pequeno
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Copie o JSON (compacto) do fluxo:', text)
    }
    closeMenu()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeMenu} />
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[220px] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
        style={{ left: menu.position.x, top: menu.position.y, visibility: 'hidden' }}
      >
        <div className="px-3 py-2 border-b border-slate-700/60 bg-slate-800/40">
          <p className="text-xs font-semibold text-slate-200">{isNode ? 'Ferramentas do bloco' : 'Ferramentas do canvas'}</p>
        </div>

        <div className="py-1">
          {!isNode && (
            <button
              onClick={actionAddRecipe}
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Adicionar receita…
            </button>
          )}

          {isNode && (
            <>
              <button
                onClick={actionMagic}
                className="w-full text-left px-3 py-2 text-sm text-amber-300 hover:bg-slate-800 transition-colors"
              >
                Mágica (planejar fornecedores)…
              </button>
              <button
                onClick={actionCopyFlow}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copia nós e arestas conectados a este bloco"
              >
                Copiar fluxo (debug)
              </button>
              <button
                onClick={actionCopyFlowCompact}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copia um JSON bem pequeno, com os campos essenciais"
              >
                Copiar fluxo (compacto)
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

