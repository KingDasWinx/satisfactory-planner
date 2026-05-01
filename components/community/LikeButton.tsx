'use client'

import { useEffect, useMemo, useState } from 'react'

type LikesState = { count: number; likedByMe: boolean }

export function LikeButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<LikesState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`/api/projects/${encodeURIComponent(projectId)}/likes`)
      .then((r) => (r.ok ? (r.json() as Promise<LikesState>) : Promise.reject(new Error('bad'))))
      .then((json) => { if (!cancelled) setState({ count: Number(json.count ?? 0), likedByMe: Boolean(json.likedByMe) }) })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar likes.') })
    return () => { cancelled = true }
  }, [projectId])

  const label = useMemo(() => {
    if (!state) return 'Curtir'
    return state.likedByMe ? `Curtido (${state.count})` : `Curtir (${state.count})`
  }, [state])

  async function toggle() {
    if (!state || loading) return
    setLoading(true)
    setError(null)
    const nextLiked = !state.likedByMe
    const optimisticCount = Math.max(0, state.count + (nextLiked ? 1 : -1))
    setState({ likedByMe: nextLiked, count: optimisticCount })

    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/like`, { method: nextLiked ? 'POST' : 'DELETE' }).catch(() => null)
    setLoading(false)
    if (!res) { setError('Falha de rede.'); return }
    if (res.status === 401) { setError('Faça login para curtir.'); return }
    if (!res.ok) { setError('Não foi possível atualizar.'); return }
    // Re-sync para evitar drift
    const rr = await fetch(`/api/projects/${encodeURIComponent(projectId)}/likes`).catch(() => null)
    if (rr?.ok) {
      const json = (await rr.json().catch(() => null)) as null | LikesState
      if (json) setState({ count: Number(json.count ?? 0), likedByMe: Boolean(json.likedByMe) })
    }
  }

  return (
    <button
      type="button"
      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
        state?.likedByMe
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-500/60'
          : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700'
      } ${loading ? 'opacity-70' : ''}`}
      aria-label={state?.likedByMe ? 'Descurtir projeto' : 'Curtir projeto'}
      aria-busy={loading}
      disabled={loading || !state}
      onClick={() => { void toggle() }}
    >
      {label}
      {error && <span className="sr-only">{error}</span>}
    </button>
  )
}

