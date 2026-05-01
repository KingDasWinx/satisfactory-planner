'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoginModal } from '@/components/auth/LoginModal'
import { LevelProgressBar } from './LevelProgressBar'

interface StatsData {
  level: number
  points: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function UserSection() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)

  const username = (session?.user as unknown as { username?: string } | undefined)?.username ?? null
  const displayName = session?.user?.name ?? username ?? 'Conta'

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    fetch('/api/me/stats')
      .then((r) => r.ok ? (r.json() as Promise<StatsData>) : Promise.reject(new Error('bad')))
      .then((json) => {
        if (!cancelled) setStats({ level: Number(json.level ?? 1), points: Number(json.points ?? 0) })
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [session?.user])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-6 border-b border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-slate-100">Usuário</h1>
      </div>

      <div className="flex-1 px-8 py-6">
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

        {status === 'loading' ? (
          <p className="text-slate-600 text-sm">Carregando...</p>
        ) : session?.user ? (
          <div className="space-y-5">
            {/* Identity card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={displayName}
                    className="w-10 h-10 rounded-full ring-2 ring-amber-500/30 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 ring-2 ring-amber-500/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-slate-300">{initials(displayName)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{displayName}</p>
                  {username && <p className="text-xs text-slate-500">@{username}</p>}
                </div>
              </div>

              {stats && <LevelProgressBar level={stats.level} points={stats.points} />}
            </div>

            {/* Navigation buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={!username}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors text-left flex items-center gap-2"
                onClick={() => { if (username) router.push(`/u/@${username}`) }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Ver meu perfil
              </button>
              <button
                type="button"
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors text-left flex items-center gap-2"
                onClick={() => router.push('/me')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                Meu painel
              </button>
            </div>

            {!username && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Configure seu username nas configurações para acessar o perfil.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Entre na sua conta</p>
                <p className="text-xs text-slate-500 mt-1">Salve projetos na nuvem e interaja com a comunidade.</p>
              </div>
              <button
                type="button"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors"
                onClick={() => setLoginOpen(true)}
              >
                Entrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
