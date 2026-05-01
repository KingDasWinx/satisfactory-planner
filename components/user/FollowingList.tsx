'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = { username: string; name: string | null; image: string | null }

export function FollowingList({ username }: { username: string }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/users/${encodeURIComponent(username)}/following?q=${encodeURIComponent(q)}`)
      .then((r) => r.ok ? r.json() as Promise<Item[]> : Promise.reject(new Error('bad')))
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [username, q])

  return (
    <div className="space-y-3">
      <input
        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
        placeholder="Buscar seguindo..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading ? (
        <p className="text-sm text-slate-600">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-600">Não está seguindo ninguém.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((u) => (
            <Link
              key={u.username}
              href={`/u/@${u.username}`}
              className="rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-100 truncate">{u.name ?? `@${u.username}`}</p>
              <p className="text-xs text-slate-500">@{u.username}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

