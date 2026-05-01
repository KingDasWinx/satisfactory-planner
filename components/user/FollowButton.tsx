'use client'

import { useEffect, useState } from 'react'

interface FollowButtonProps {
  username: string
  initialIsFollowing: boolean
}

export function FollowButton({ username, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  async function toggle() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
      method: isFollowing ? 'DELETE' : 'POST',
    }).catch(() => null)

    setLoading(false)
    if (!res) { setError('Falha de rede.'); return }
    if (res.status === 401) { setError('Faça login para seguir.'); return }
    if (!res.ok) { setError('Não foi possível atualizar.'); return }

    setIsFollowing((v) => !v)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={toggle}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          isFollowing
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-900'
        } disabled:opacity-60`}
      >
        {loading ? '...' : (isFollowing ? 'Seguindo' : 'Seguir')}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}

