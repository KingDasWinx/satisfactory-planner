'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useProjectStore } from '@/store/projectStore'
import { EditProfileForm } from '@/components/user/EditProfileForm'
import { LoginModal } from '@/components/auth/LoginModal'
import { LevelProgressBar } from './LevelProgressBar'
import { AchievementBadgeList } from './AchievementBadgeList'

interface Achievement {
  key: string
  title: string
  description: string
  createdAt?: number
}

interface StatsData {
  level: number
  points: number
  achievements: Achievement[]
}

export function UserSection() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportCloudProjects = useProjectStore((s) => s.exportCloudProjects)

  const username = (session?.user as unknown as { username?: string } | undefined)?.username ?? null

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    setStatsError(null)
    fetch('/api/me/stats')
      .then((r) =>
        r.ok
          ? (r.json() as Promise<StatsData>)
          : Promise.reject(new Error('bad'))
      )
      .then((json) => {
        if (!cancelled)
          setStats({
            level: Number(json.level ?? 1),
            points: Number(json.points ?? 0),
            achievements: Array.isArray(json.achievements) ? json.achievements : [],
          })
      })
      .catch(() => {
        if (!cancelled)
          setStatsError('Não foi possível carregar sua pontuação.')
      })
    return () => {
      cancelled = true
    }
  }, [session?.user])

  async function handleExportCloud() {
    if (exporting) return
    setExporting(true)
    const json = await exportCloudProjects().catch(() => null)
    setExporting(false)
    if (!json) return
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satisfactory-planner-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {session.user.name ?? 'Conta'}
                </p>
                {session.user.email && (
                  <p className="text-xs text-slate-500 mt-1">{session.user.email}</p>
                )}
                {username && <p className="text-xs text-slate-500 mt-1">@{username}</p>}
              </div>

              {stats ? (
                <>
                  <LevelProgressBar level={stats.level} points={stats.points} />
                  {stats.achievements && stats.achievements.length > 0 && (
                    <AchievementBadgeList achievements={stats.achievements} />
                  )}
                </>
              ) : statsError ? (
                <p className="text-xs text-amber-300">{statsError}</p>
              ) : (
                <p className="text-xs text-slate-600">Carregando pontuação...</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
                onClick={() => router.push('/me')}
              >
                Meu painel
              </button>
              <button
                type="button"
                disabled={!username}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
                onClick={() => {
                  if (username) router.push(`/u/@${username}`)
                }}
              >
                Meu perfil
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors disabled:opacity-60"
                disabled={exporting}
                onClick={() => {
                  void handleExportCloud()
                }}
              >
                {exporting ? 'Exportando...' : 'Exportar (cloud)'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? 'Fechar edição' : 'Editar perfil'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
                onClick={() => {
                  void signOut({ redirect: false })
                }}
              >
                Sair
              </button>
            </div>

            {editing && <EditProfileForm />}

            {!username && (
              <p className="text-xs text-amber-300">
                Seu username ainda não está definido. (MVP: vamos definir no
                cadastro/login.)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-500 text-sm">
              Faça login para salvar projetos na nuvem e interagir com a
              comunidade.
            </p>
            <button
              type="button"
              className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors"
              onClick={() => setLoginOpen(true)}
            >
              Entrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
