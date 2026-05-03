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

  if (loading) return <p className="text-sm text-slate-600">Loading...</p>
  if (items.length === 0) return <p className="text-sm text-slate-600">No featured projects.</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/project/${p.id}/view`}
          className="group relative rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent hover:border-amber-500/50 transition-all p-4"
        >
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              ★ Featured
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-100 truncate pr-24">{p.name}</p>
          {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-3">{p.description}</p>}
          <p className="text-xs text-slate-600 mt-3">Updated {new Date(p.updatedAt).toLocaleDateString('en-US')}</p>
        </Link>
      ))}
    </div>
  )
}

