'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Featured = { id: string; name: string; description: string; updatedAt: number }

export function FeaturedProjects({ username }: { username: string }) {
  const [items, setItems] = useState<Featured[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/users/${encodeURIComponent(username)}/featured`)
      .then((r) => (r.ok ? (r.json() as Promise<Featured[]>) : Promise.reject(new Error('bad'))))
      .then((json) => { if (!cancelled) setItems(Array.isArray(json) ? json : []) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [username])

  if (loading) return <p className="text-sm text-slate-600">Carregando...</p>
  if (items.length === 0) return <p className="text-sm text-slate-600">Nenhum destaque.</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/project/${p.id}/view`}
          className="rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors p-4"
        >
          <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
          {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-3">{p.description}</p>}
          <p className="text-xs text-slate-600 mt-3">Atualizado em {new Date(p.updatedAt).toLocaleDateString('pt-BR')}</p>
        </Link>
      ))}
    </div>
  )
}

