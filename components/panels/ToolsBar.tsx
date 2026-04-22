'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectsPanel } from './ProjectsPanel'
import type { ProjectMeta } from '@/lib/types/projects'

type ActiveTool = 'pointer' | 'text' | 'frame'

interface ToolsBarProps {
  activeTool: ActiveTool
  onSetTool: (tool: ActiveTool) => void
  onExportPng: () => void
  onUndo: () => void
  onRedo: () => void
  onLoadProject: (meta: ProjectMeta) => void
  projectName: string
  isSaved: boolean
}

function IconFolder() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" aria-hidden>
      <path
        d="M1.5 4.5A1 1 0 0 1 2.5 3.5h3.086a1 1 0 0 1 .707.293L7.5 5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.5z"
        stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"
      />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ToolsBar({
  activeTool,
  onSetTool,
  onExportPng,
  onUndo,
  onRedo,
  onLoadProject,
  projectName,
  isSaved,
}: ToolsBarProps) {
  const [projectsOpen, setProjectsOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <div data-toolbar className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/95 px-2 py-1.5 shadow-xl shadow-black/40 backdrop-blur-sm">

        {/* Voltar para Home */}
        <button
          className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Voltar para projetos"
          onClick={() => router.push('/home')}
        >
          <IconArrowLeft />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-0.5" />

        {/* Projetos */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Projetos"
          onClick={() => setProjectsOpen((v) => !v)}
        >
          <IconFolder />
          <span className="max-w-[120px] truncate">{projectName || 'Sem projeto'}</span>
          {!isSaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Salvando..." />}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Ferramentas de criação */}
        <button
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === 'pointer'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Seleção (Esc)"
          onClick={() => onSetTool('pointer')}
        >
          ↖
        </button>
        <button
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === 'text'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Nota de texto (T)"
          onClick={() => onSetTool(activeTool === 'text' ? 'pointer' : 'text')}
        >
          T
        </button>
        <button
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === 'frame'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Área/Frame (F)"
          onClick={() => onSetTool(activeTool === 'frame' ? 'pointer' : 'frame')}
        >
          ▭
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Undo / Redo */}
        <button
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Desfazer (Ctrl+Z)"
          onClick={onUndo}
        >
          ↩
        </button>
        <button
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Refazer (Ctrl+Y)"
          onClick={onRedo}
        >
          ↪
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Exportar PNG */}
        <button
          className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Exportar PNG"
          onClick={onExportPng}
        >
          ⬇ PNG
        </button>
      </div>

      {projectsOpen && (
        <ProjectsPanel
          onLoadProject={onLoadProject}
          onClose={() => setProjectsOpen(false)}
        />
      )}
    </>
  )
}
