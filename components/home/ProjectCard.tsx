'use client'

import { memo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import { MachineNode } from '@/components/nodes/MachineNode'
import { SplitterNode } from '@/components/nodes/SplitterNode'
import { MergerNode } from '@/components/nodes/MergerNode'
import { StorageNode } from '@/components/nodes/StorageNode'
import { TextNode } from '@/components/nodes/TextNode'
import { FrameNode } from '@/components/nodes/FrameNode'
import { MultiMachinesProvider } from '@/lib/gameDataContext'
import { ProjectManageModal } from './ProjectManageModal'
import type { ProjectMeta } from '@/lib/types/projects'
import type { ProjectData } from '@/lib/types/projects'
import type { MultiMachine } from '@/lib/types/game'

const nodeTypes = {
  machineNode: MachineNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
  storageNode: StorageNode,
  textNode: TextNode,
  frameNode: FrameNode,
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days}d`
}

interface ProjectCardProps {
  meta: ProjectMeta
  data: ProjectData | null
  multiMachines: MultiMachine[]
  onDelete: (id: string) => void
}

export const ProjectCard = memo(function ProjectCard({ meta, data, multiMachines, onDelete }: ProjectCardProps) {
  const router = useRouter()
  const [manageOpen, setManageOpen] = useState(false)

  const nodeCount = data?.nodes.length ?? 0
  const edgeCount = data?.edges.length ?? 0

  function openEditor() {
    router.push(`/project/${meta.id}/edit`)
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-700 bg-slate-900 overflow-hidden hover:border-slate-600 transition-colors">

      {/* Mini canvas preview */}
      <div
        className="relative w-full cursor-pointer"
        style={{ height: 160 }}
        onClick={openEditor}
      >
        <MultiMachinesProvider value={multiMachines}>
          <ReactFlow
            nodes={data?.nodes ?? []}
            edges={data?.edges ?? []}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#0a0c11' }}
            minZoom={0.05}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e2330" />
          </ReactFlow>
        </MultiMachinesProvider>

        {/* Overlay escuro no hover com ação */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-white bg-amber-500 rounded-lg px-3 py-1.5">
            Abrir editor
          </span>
        </div>

        {/* Badge público */}
        {meta.isPublic && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs text-emerald-400">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1.5C8 1.5 5 5 5 8s3 6.5 3 6.5M8 1.5C8 1.5 11 5 11 8s-3 6.5-3 6.5M1.5 8h13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Público
          </div>
        )}
      </div>

      {/* Footer do card */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{meta.name}</p>

          {/* Botão de opções */}
          <button
            className="shrink-0 rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-colors"
            title="Opções do projeto"
            onClick={(e) => { e.stopPropagation(); setManageOpen(true) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        </div>

        {meta.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{meta.description}</p>
        )}

        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-slate-600">
            {nodeCount > 0 ? `${nodeCount} nós · ${edgeCount} arestas` : 'Canvas vazio'}
          </p>
          <p className="text-xs text-slate-600">{formatRelative(meta.updatedAt)}</p>
        </div>

        {meta.tags && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {meta.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {manageOpen && (
        <ProjectManageModal
          meta={meta}
          onClose={() => setManageOpen(false)}
          onDelete={onDelete}
        />
      )}
    </div>
  )
})
