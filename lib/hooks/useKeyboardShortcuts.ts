'use client'

import { useEffect } from 'react'
import { useFactoryStore } from '@/store/factoryStore'

export function useKeyboardShortcuts() {
  const copyNodes = useFactoryStore((s) => s.copyNodes)
  const startPaste = useFactoryStore((s) => s.startPaste)
  const isGhostActive = useFactoryStore((s) => s.isGhostActive)
  const cancelPaste = useFactoryStore((s) => s.cancelPaste)
  const undo = useFactoryStore((s) => s.undo)
  const redo = useFactoryStore((s) => s.redo)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey
      const activeEl = document.activeElement as HTMLElement

      // Não dispara se foco está em input/textarea
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return

      if (e.key === 'Escape' && isGhostActive) {
        cancelPaste()
        return
      }

      if (!ctrl) return

      if (e.key === 'c') {
        e.preventDefault()
        copyNodes()
      } else if (e.key === 'v') {
        e.preventDefault()
        startPaste()
      } else if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [copyNodes, startPaste, undo, redo, isGhostActive, cancelPaste])
}
