'use client'

import { useEffect, useMemo, useState } from 'react'

type BookmarkState = { bookmarked: boolean }
type BookmarkRow = { project: { id: string } }

export function BookmarkButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<BookmarkState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch('/api/me/bookmarks')
      .then((r) => {
        if (r.status === 401) return Promise.resolve([] as BookmarkRow[])
        if (!r.ok) throw new Error('bad')
        return r.json() as Promise<BookmarkRow[]>
      })
      .then((json) => {
        const list = Array.isArray(json) ? json : []
        const ok = list.some((b) => b.project.id === projectId)
        if (!cancelled) setState({ bookmarked: ok })
      })
      .catch(() => { if (!cancelled) setError('Could not load bookmarks.') })
    return () => { cancelled = true }
  }, [projectId])

  const label = useMemo(() => {
    if (!state) return 'Bookmark'
    return state.bookmarked ? 'Bookmarked' : 'Bookmark'
  }, [state])

  async function toggle() {
    if (!state || loading) return
    setLoading(true)
    setError(null)
    const next = !state.bookmarked
    setState({ bookmarked: next })
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/bookmark`, { method: next ? 'POST' : 'DELETE' }).catch(() => null)
    setLoading(false)
    if (!res) { setError('Network error.'); return }
    if (res.status === 401) { setError('Sign in to bookmark.'); return }
    if (!res.ok) { setError('Could not update.'); return }
  }

  return (
    <button
      type="button"
      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
        state?.bookmarked
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/60'
          : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700'
      } ${loading ? 'opacity-70' : ''}`}
      aria-label={state?.bookmarked ? 'Remove bookmark' : 'Bookmark project'}
      aria-busy={loading}
      disabled={loading || !state}
      onClick={() => { void toggle() }}
    >
      {label}
      {error && <span className="sr-only">{error}</span>}
    </button>
  )
}

