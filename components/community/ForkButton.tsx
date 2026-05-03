'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/store/uiStore'

interface ForkButtonProps {
  projectId: string
}

function IconFork() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="7" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="20" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 6v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 10v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ForkButton({ projectId }: ForkButtonProps) {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openLoginModal = useUiStore((s) => s.openLoginModal)
  const setPendingAction = useUiStore((s) => s.setPendingAction)

  async function handleFork() {
    if (loading) return

    if (status !== 'authenticated') {
      setPendingAction({ type: 'fork', projectId })
      openLoginModal()
      return
    }

    setLoading(true)
    setError(null)
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/fork`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target: 'cloud' }),
    }).catch(() => null)
    setLoading(false)

    if (!res?.ok) { setError('Could not fork.'); return }
    const json = await res.json().catch(() => null) as { mode?: string; id?: string } | null
    if (json?.mode === 'cloud' && json.id) {
      router.push(`/project/${json.id}/edit`)
    } else {
      setError('Resposta inesperada do servidor.')
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleFork()}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-200 transition-colors disabled:opacity-60"
      >
        <IconFork />
        {loading ? 'Forking...' : 'Fork'}
      </button>
      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  )
}
