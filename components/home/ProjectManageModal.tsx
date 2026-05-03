'use client'

import { useState, useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/projectStore'
import type { ProjectMeta } from '@/lib/types/projects'

interface ProjectManageModalProps {
  meta: ProjectMeta
  onClose: () => void
  onDelete: (id: string) => void
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProjectManageModal({ meta, onClose, onDelete }: ProjectManageModalProps) {
  const updateProjectMeta = useProjectStore((s) => s.updateProjectMeta)

  const [name, setName] = useState(meta.name)
  const [description, setDescription] = useState(meta.description ?? '')
  const [isPublic, setIsPublic] = useState(meta.isPublic ?? false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isDirty =
    name.trim() !== meta.name ||
    description.trim() !== (meta.description ?? '') ||
    isPublic !== (meta.isPublic ?? false)

  async function handleSave() {
    if (!isDirty || !name.trim() || saving) return
    setSaving(true)
    updateProjectMeta(meta.id, {
      name: name.trim(),
      description: description.trim(),
      isPublic,
    })
    setSaving(false)
    onClose()
  }

  function handleDelete() {
    onDelete(meta.id)
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Manage project</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 transition-colors"
              placeholder="Project name"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500 transition-colors resize-none"
              placeholder="Describe the project (optional)"
            />
          </div>

          {/* Visibilidade */}
          <div className="flex items-center justify-between rounded-lg bg-slate-800/60 border border-slate-700/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Public project</p>
              <p className="text-xs text-slate-500 mt-0.5">Visible to the entire community</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={`relative w-10 h-5.5 rounded-full transition-colors focus:outline-none ${
                isPublic ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                  isPublic ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || !name.trim() || saving}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm py-2.5 transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>

          <div className="h-px bg-slate-800" />

          {confirmDelete ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 space-y-3">
              <p className="text-sm text-red-400 font-medium">Delete permanently?</p>
              <p className="text-xs text-slate-500">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm py-2.5 transition-colors"
            >
              <IconTrash />
              Delete project
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
