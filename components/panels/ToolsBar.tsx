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

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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

function IconPointer() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 3l14 9-7 1-4 7L5 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7V5h16v2M12 5v14M9 19h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconFrame() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
    </svg>
  )
}

function IconUndo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7h11a6 6 0 0 1 0 12H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3L3 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRedo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 7H10a6 6 0 0 0 0 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
          title="Back to projects"
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
          <span className="max-w-[120px] truncate">{projectName || 'No project'}</span>
          {!isSaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Saving..." />}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Ferramentas de criação */}
        <button
          className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${
            activeTool === 'pointer'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Selection (Esc)"
          onClick={() => onSetTool('pointer')}
        >
          <IconPointer />
        </button>
        <button
          className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${
            activeTool === 'text'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Text note (T)"
          onClick={() => onSetTool(activeTool === 'text' ? 'pointer' : 'text')}
        >
          <IconText />
        </button>
        <button
          className={`flex items-center justify-center rounded-lg p-1.5 transition-colors ${
            activeTool === 'frame'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
          title="Area/Frame (F)"
          onClick={() => onSetTool(activeTool === 'frame' ? 'pointer' : 'frame')}
        >
          <IconFrame />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Undo / Redo */}
        <button
          className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
        >
          <IconUndo />
        </button>
        <button
          className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Redo (Ctrl+Y)"
          onClick={onRedo}
        >
          <IconRedo />
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Exportar PNG */}
        <button
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          title="Export PNG"
          onClick={onExportPng}
        >
          <IconDownload />
          <span>PNG</span>
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
