'use client'

import { useEffect, useId, useMemo } from 'react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { CreateProjectFormInput, ProjectVisibility } from '@/lib/types/projects'

interface CreateProjectModalProps {
  open: boolean
  initialName?: string
  onClose: () => void
  onCreate: (input: CreateProjectFormInput) => void
}

function visibilityLabel(v: ProjectVisibility): string {
  return v === 'private' ? 'Privado' : 'Comunidade'
}

export function CreateProjectModal({ open, initialName, onClose, onCreate }: CreateProjectModalProps) {
  const titleId = useId()
  const { status } = useSession()
  const [name, setName] = useState(initialName ?? '')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ProjectVisibility>('private')

  const saveTarget = status === 'authenticated' ? 'cloud' : 'local'

  useEffect(() => {
    if (!open) return
    setName(initialName ?? '')
    setDescription('')
    setVisibility('private')
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const canCreate = useMemo(() => name.trim().length > 0, [name])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000]">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
        >
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-sm font-bold text-slate-100 leading-tight">
                Criar projeto
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina um nome, uma descrição e a visibilidade.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-name`}>
                Nome
              </label>
              <input
                id={`${titleId}-name`}
                autoFocus
                className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
                placeholder="Nova fábrica"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-desc`}>
                Descrição
              </label>
              <textarea
                id={`${titleId}-desc`}
                className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500 min-h-[90px] resize-none"
                placeholder="Opcional. Ex.: Minha base de alumínio + trens."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Visibilidade</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['private', 'community'] as const).map((v) => {
                  const active = visibility === v
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-amber-500/60 bg-amber-500/10'
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800/60'
                      }`}
                      onClick={() => setVisibility(v)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${active ? 'text-amber-300' : 'text-slate-200'}`}>
                          {visibilityLabel(v)}
                        </span>
                        <span className={`text-xs ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                          {active ? 'Selecionado' : 'Selecionar'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {v === 'private'
                          ? 'Fica só com você (não aparece na aba Comunidade).'
                          : 'Aparece para outras pessoas na aba Comunidade.'}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500 shrink-0">
                {saveTarget === 'cloud'
                  ? <><path d="M18 10a6 6 0 0 0-12 0c0 .34.03.67.08 1A5 5 0 0 0 7 21h10a5 5 0 0 0 1-9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>
                  : <><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M8 20h8M12 18v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>
                }
              </svg>
              <p className="text-xs text-slate-400">
                {saveTarget === 'cloud' ? 'Salvo na nuvem (conta conectada)' : 'Salvo localmente neste navegador'}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canCreate}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                const trimmed = name.trim()
                onCreate({
                  name: trimmed || 'Nova fábrica',
                  description: description.trim(),
                  visibility,
                  saveTarget,
                })
              }}
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

