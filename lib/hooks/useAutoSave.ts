import { useEffect, useRef } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import { useFactoryStore } from '@/store/factoryStore'
import { useProjectStore } from '@/store/projectStore'

const DEBOUNCE_MS = 1500

interface UseAutoSaveProps {
  rfInstance: React.MutableRefObject<ReactFlowInstance | null>
}

export function useAutoSave({ rfInstance }: UseAutoSaveProps) {
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)
  const saveActiveProject = useProjectStore((s) => s.saveActiveProject)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!activeProjectId) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const viewport = rfInstance.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 }
      saveActiveProject(nodes, edges, viewport)
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [nodes, edges, activeProjectId, saveActiveProject, rfInstance])
}
