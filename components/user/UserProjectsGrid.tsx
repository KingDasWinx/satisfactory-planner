'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type PublicProject = {
  id: string
  name: string
  description: string
  updatedAt: number
}

interface UserProjectsGridProps {
  username: string
}

export function UserProjectsGrid({ username }: UserProjectsGridProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<PublicProject[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/users/${encodeURIComponent(username)}/projects`)
      .then((r) => r.ok ? r.json() as Promise<PublicProject[]> : Promise.reject(new Error('bad status')))
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Não foi possível carregar os projetos.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [username])

  if (loading) {
    return <p className="text-sm text-slate-600">Carregando projetos...</p>
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-600">Nenhum projeto público ainda.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/project/${p.id}/view`}
          className="block rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/70 transition-colors p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
            <span className="text-[11px] text-slate-600">/view</span>
          </div>
          {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{p.description}</p>}
          <p className="text-xs text-slate-600 mt-3">Atualizado em {new Date(p.updatedAt).toLocaleDateString('pt-BR')}</p>
        </Link>
      ))}
    </div>
  )
}

