'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

type CommentUser = { username: string; name: string | null; image: string | null }
type Comment = { id: string; content: string; createdAt: number; user: CommentUser }

export function CommentsPanel({ projectId }: { projectId: string }) {
  const { data: session } = useSession()
  const myUsername = (session?.user as unknown as { username?: string } | undefined)?.username ?? null

  const [items, setItems] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refreshTimer = useRef<number | null>(null)

  const canPost = useMemo(() => content.trim().length > 0 && content.trim().length <= 500, [content])

  async function refresh() {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/comments`).catch(() => null)
    if (!res) { setLoading(false); setError('Network error.'); return }
    if (!res.ok) { setLoading(false); setError('Could not load.'); return }
    const json = (await res.json().catch(() => null)) as unknown
    setItems(Array.isArray(json) ? (json as Comment[]) : [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/projects/${encodeURIComponent(projectId)}/comments`)
      .then((r) => (r.ok ? (r.json() as Promise<Comment[]>) : Promise.reject(new Error('bad'))))
      .then((json) => { if (!cancelled) setItems(Array.isArray(json) ? json : []) })
      .catch(() => { if (!cancelled) setError('Could not load.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current)
        refreshTimer.current = null
      }
    }
  }, [projectId])

  async function post() {
    if (!canPost || posting) return
    setPosting(true)
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    }).catch(() => null)
    setPosting(false)
    if (!res) { setError('Network error.'); return }
    if (res.status === 401) { setError('Sign in to comment.'); return }
    if (!res.ok) { setError('Could not send.'); return }
    setContent('')
    refreshTimer.current = window.setTimeout(() => { void refresh() }, 250)
  }

  async function del(commentId: string) {
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }).catch(() => null)
    if (!res) { setError('Network error.'); return }
    if (res.status === 403) return
    if (!res.ok) { setError('Could not delete.'); return }
    setItems((prev) => prev.filter((c) => c.id !== commentId))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <textarea
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 min-h-[84px] resize-none"
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="Write a comment"
          aria-busy={posting}
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">{content.trim().length}/500</p>
          <button
            type="button"
            className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-3 py-1.5 text-xs font-semibold text-slate-900"
            disabled={!canPost || posting}
            onClick={() => { void post() }}
            aria-label="Post comment"
            aria-busy={posting}
          >
            {posting ? 'Sending...' : 'Send'}
          </button>
        </div>
        {error && <p className="text-xs text-amber-300">{error}</p>}
      </div>

      {loading ? (
        <p className="text-xs text-slate-600">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-600">No comments yet.</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
          {items.map((c) => {
            const mine = myUsername && c.user?.username === myUsername
            return (
              <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {c.user?.name ?? `@${c.user?.username ?? 'user'}`}
                    </p>
                    {c.user?.username && <p className="text-[11px] text-slate-500">@{c.user.username}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-slate-600">{new Date(c.createdAt).toLocaleString('pt-BR')}</p>
                    {mine && (
                      <button
                        type="button"
                        className="text-[11px] text-slate-500 hover:text-red-300"
                        onClick={() => { void del(c.id) }}
                        aria-label="Delete comment"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

