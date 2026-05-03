'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import { TextConfigPopup } from '@/components/nodes/TextConfigPopup'
import type { TextNode } from '@/lib/types'
import { showMagicPlannerInContextMenu } from '@/lib/utils/magicPlannerVisibility'
// (exportConnectedFlow removed — now uses same clipboard behavior as Ctrl+C)

const MARGIN = 12

export function ContextMenu() {
  const menu = useFactoryStore((s) => s.menu)
  const closeMenu = useFactoryStore((s) => s.closeMenu)
  const openMenu = useFactoryStore((s) => s.openMenu)
  const runMagicPlanner = useFactoryStore((s) => s.runMagicPlanner)
  const clipboard = useFactoryStore((s) => s.clipboard)
  const copyNode = useFactoryStore((s) => s.copyNode)
  const deleteNode = useFactoryStore((s) => s.deleteNode)
  const commitPaste = useFactoryStore((s) => s.commitPaste)
  const resetTextNodeStyle = useFactoryStore((s) => s.resetTextNodeStyle)
  const nodes = useFactoryStore((s) => s.nodes)

  const menuRef = useRef<HTMLDivElement>(null)
  const [textPopup, setTextPopup] = useState<{ nodeId: string; anchorRect: DOMRect } | null>(null)

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

  const selectedNode = isNode ? (nodes.find((n) => n.id === menu.nodeId) ?? null) : null

  const isTextNode = selectedNode?.type === 'textNode'
  const magicVisible = selectedNode !== null && showMagicPlannerInContextMenu(selectedNode)

  function actionAddRecipe() {
    if (!menu || menu.type !== 'context') return
    openMenu({ type: 'canvas', position: menu.position, flowPosition: menu.flowPosition })
  }

  function actionMagic() {
    if (!menu || menu.type !== 'nodeContext') return
    runMagicPlanner(menu.nodeId, menu.position)
  }

  async function actionCopyNode() {
    if (!menu || menu.type !== 'nodeContext') return
    copyNode(menu.nodeId)
    closeMenu()
  }

  function actionDeleteNode() {
    if (!menu || menu.type !== 'nodeContext') return
    deleteNode(menu.nodeId)
    closeMenu()
  }

  function actionPaste() {
    if (!menu || menu.type !== 'context') return
    if (!clipboard || clipboard.nodes.length === 0) return
    commitPaste(menu.flowPosition)
    closeMenu()
  }

  function actionEditText() {
    if (!menu || menu.type !== 'nodeContext') return
    const node = nodes.find((n) => n.id === menu.nodeId)
    if (!node || node.type !== 'textNode') return
    const anchorRect = menuRef.current?.getBoundingClientRect()
    if (!anchorRect) return
    setTextPopup({ nodeId: menu.nodeId, anchorRect })
    closeMenu()
  }

  function actionResetTextStyle() {
    if (!menu || menu.type !== 'nodeContext') return
    const node = nodes.find((n) => n.id === menu.nodeId)
    if (!node || node.type !== 'textNode') return
    resetTextNodeStyle(menu.nodeId)
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
          <p className="text-xs font-semibold text-slate-200">{isNode ? 'Block tools' : 'Canvas tools'}</p>
        </div>

        <div className="py-1">
          {!isNode && (
            <>
              <button
                onClick={actionAddRecipe}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Add recipe…
              </button>
              <button
                onClick={actionPaste}
                disabled={!clipboard || clipboard.nodes.length === 0}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                title={!clipboard || clipboard.nodes.length === 0 ? 'Nothing to paste' : 'Paste the Ctrl+C content'}
              >
                Paste
              </button>
            </>
          )}

          {isNode && (
            <>
              {magicVisible && (
                <button
                  onClick={actionMagic}
                  className="w-full text-left px-3 py-2 text-sm text-amber-300 hover:bg-slate-800 transition-colors"
                >
                  Magic
                </button>
              )}
              {isTextNode && (
                <>
                  <button
                    onClick={actionEditText}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    Edit text…
                  </button>
                  <button
                    onClick={actionResetTextStyle}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Removes customizations and resets to default"
                  >
                    Reset style
                  </button>
                </>
              )}
              <button
                onClick={actionCopyNode}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copy this block (like Ctrl+C)"
              >
                Copy block
              </button>
              <button
                onClick={actionDeleteNode}
                className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-slate-800 transition-colors"
                title="Remove only this block"
              >
                Delete block
              </button>
            </>
          )}
        </div>
      </div>

      {textPopup && (() => {
        const node = nodes.find((n) => n.id === textPopup.nodeId)
        if (!node || node.type !== 'textNode') return null
        return (
          <TextConfigPopup
            id={node.id}
            data={(node as TextNode).data}
            anchorRect={textPopup.anchorRect}
            onClose={() => setTextPopup(null)}
          />
        )
      })()}
    </>
  )
}

