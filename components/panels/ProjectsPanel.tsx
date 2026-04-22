'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useProjectStore } from '@/store/projectStore'
import { useFactoryStore } from '@/store/factoryStore'
import type { ProjectMeta } from '@/lib/types/projects'

interface ProjectsPanelProps {
  onLoadProject: (meta: ProjectMeta) => void
  onClose: () => void
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days}d`
}

export function ProjectsPanel({ onLoadProject, onClose }: ProjectsPanelProps) {
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const createProject = useProjectStore((s) => s.createProject)
  const renameProject = useProjectStore((s) => s.renameProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const loadProject = useProjectStore((s) => s.loadProject)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const newNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus()
  }, [renamingId])

  useEffect(() => {
    if (creatingNew && newNameInputRef.current) newNameInputRef.current.focus()
  }, [creatingNew])

  function handleSelect(meta: ProjectMeta) {
    if (meta.id === activeProjectId) { onClose(); return }
    const data = loadProject(meta.id)
    if (data) onLoadProject(meta)
    onClose()
  }

  function handleCreate() {
    const name = newProjectName.trim() || 'Nova fábrica'
    createProject(name)
    setNewProjectName('')
    setCreatingNew(false)
    onClose()
  }

  function handleRenameCommit(id: string) {
    const name = renameValue.trim()
    if (name) renameProject(id, name)
    setRenamingId(null)
  }

  function handleDelete(id: string) {
    const newActiveId = deleteProject(id)
    if (newActiveId) {
      const data = loadProject(newActiveId)
      if (data) onLoadProject(projects.find((p) => p.id === newActiveId)!)
    }
    setConfirmDeleteId(null)
  }

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      <div
        className="fixed z-[9999] top-16 left-4 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">Projetos</span>
          <button
            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
            onClick={() => setCreatingNew(true)}
          >
            + Novo
          </button>
        </div>

        {creatingNew && (
          <div className="px-4 py-2 border-b border-slate-700 flex gap-2">
            <input
              ref={newNameInputRef}
              className="flex-1 bg-slate-800 text-sm text-slate-200 rounded px-2 py-1 outline-none border border-slate-600 focus:border-amber-500"
              placeholder="Nome do projeto"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setCreatingNew(false)
              }}
            />
            <button className="text-xs text-amber-400 hover:text-amber-300 font-medium px-2" onClick={handleCreate}>
              Criar
            </button>
          </div>
        )}

        <ul className="max-h-80 overflow-y-auto">
          {sorted.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-600 text-sm">Nenhum projeto salvo</li>
          )}
          {sorted.map((meta) => (
            <li
              key={meta.id}
              className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b border-slate-800 last:border-b-0 ${
                meta.id === activeProjectId ? 'bg-amber-500/10' : 'hover:bg-slate-800'
              }`}
            >
              {renamingId === meta.id ? (
                <input
                  ref={renameInputRef}
                  className="flex-1 bg-slate-800 text-sm text-slate-200 rounded px-2 py-0.5 outline-none border border-amber-500"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameCommit(meta.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameCommit(meta.id)
                    if (e.key === 'Escape') setRenamingId(null)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 min-w-0" onClick={() => handleSelect(meta)}>
                  <p className={`text-sm truncate ${meta.id === activeProjectId ? 'text-amber-400 font-medium' : 'text-slate-200'}`}>
                    {meta.name}
                  </p>
                  <p className="text-xs text-slate-500">{formatRelative(meta.updatedAt)}</p>
                </div>
              )}

              {renamingId !== meta.id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="text-slate-500 hover:text-slate-300 text-xs p-1"
                    title="Renomear"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenamingId(meta.id)
                      setRenameValue(meta.name)
                    }}
                  >
                    ✏
                  </button>
                  {confirmDeleteId === meta.id ? (
                    <>
                      <button
                        className="text-red-400 hover:text-red-300 text-xs p-1 font-medium"
                        onClick={(e) => { e.stopPropagation(); handleDelete(meta.id) }}
                      >
                        Sim
                      </button>
                      <button
                        className="text-slate-500 hover:text-slate-300 text-xs p-1"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                      >
                        Não
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-slate-500 hover:text-red-400 text-xs p-1"
                      title="Excluir"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(meta.id) }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body
  )
}
