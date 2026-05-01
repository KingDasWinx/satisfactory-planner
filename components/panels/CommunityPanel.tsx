'use client'

import { useState } from 'react'
import { LikeButton } from '@/components/community/LikeButton'
import { BookmarkButton } from '@/components/community/BookmarkButton'
import { CommentsPanel } from '@/components/community/CommentsPanel'

type Tab = 'reacoes' | 'comentarios'

export function CommunityPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('reacoes')

  if (!open) {
    return (
      <button
        type="button"
        className="absolute top-4 right-4 z-10 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-200 shadow-xl shadow-black/40 backdrop-blur-sm"
        onClick={() => setOpen(true)}
      >
        Comunidade
      </button>
    )
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-700 bg-slate-900/95 shadow-xl shadow-black/40 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <p className="text-sm font-bold text-slate-100">Comunidade</p>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          onClick={() => setOpen(false)}
          aria-label="Fechar painel de comunidade"
        >
          Fechar
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <LikeButton projectId={projectId} />
          <BookmarkButton projectId={projectId} />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'reacoes' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab('reacoes')}
          >
            Reações
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'comentarios' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab('comentarios')}
          >
            Comentários
          </button>
        </div>

        {tab === 'comentarios' ? (
          <CommentsPanel projectId={projectId} />
        ) : (
          <div className="text-xs text-slate-500">
            Curta e favorite para ajudar outros a encontrarem bons projetos.
          </div>
        )}
      </div>
    </div>
  )
}

