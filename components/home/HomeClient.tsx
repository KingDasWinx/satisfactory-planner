'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { ProjectCard } from './ProjectCard'
import { CreateProjectModal } from './CreateProjectModal'
import { LoginModal } from '@/components/auth/LoginModal'
import { useSession, signOut } from 'next-auth/react'
import { EditProfileForm } from '@/components/user/EditProfileForm'
import type { ProjectData } from '@/lib/types/projects'
import type { MultiMachine } from '@/lib/types/game'
import { visibilityToIsPublic } from '@/lib/utils/projectMeta'

interface HomeClientProps {
  multiMachines: MultiMachine[]
}

type ActiveSection = 'projects' | 'community' | 'settings' | 'user'

function IconGear({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Sidebar({ active, onSelect }: { active: ActiveSection; onSelect: (s: ActiveSection) => void }) {
  const items: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
    { id: 'projects', label: 'Projetos', icon: <IconFolder /> },
    { id: 'community', label: 'Comunidade', icon: <IconUser /> },
    { id: 'settings', label: 'Configurações', icon: <IconGear /> },
  ]

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-slate-900 border-r border-slate-800 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
        <IconGear className="text-amber-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-100 leading-tight">Satisfactory</p>
          <p className="text-xs text-slate-500 leading-tight">Planner</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full
              ${active === item.id
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-3 border-t border-slate-800">
        <button
          onClick={() => onSelect('user')}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full
            ${active === 'user'
              ? 'bg-amber-500/10 text-amber-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
        >
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <IconUser className="w-3.5 h-3.5" />
          </div>
          Usuário
        </button>
      </div>
    </aside>
  )
}

function ProjectsSection({ multiMachines }: { multiMachines: MultiMachine[] }) {
  const router = useRouter()
  const projects = useProjectStore((s) => s.projects)
  const hydrateFromStorage = useProjectStore((s) => s.hydrateFromStorage)
  const createProjectLocal = useProjectStore((s) => s.createProjectLocal)
  const createProjectCloud = useProjectStore((s) => s.createProjectCloud)
  const cloudRequiresLogin = useProjectStore((s) => s.cloudRequiresLogin)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const loadProject = useProjectStore((s) => s.loadProject)

  const [projectsData, setProjectsData] = useState<Record<string, ProjectData | null>>({})
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    hydrateFromStorage()
    setHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const map: Record<string, ProjectData | null> = {}
    for (const meta of projects) {
      map[meta.id] = loadProject(meta.id)
    }
    setProjectsData(map)
  }, [hydrated, projects, loadProject])

  async function handleCreate(input: { name: string; description: string; visibility: 'private' | 'community'; saveTarget: 'local' | 'cloud' }) {
    const isPublic = visibilityToIsPublic(input.visibility)
    if (input.saveTarget === 'local') {
      const id = createProjectLocal({ name: input.name, description: input.description, isPublic })
      router.push(`/project/${id}/edit`)
      return
    }

    const id = await createProjectCloud({ name: input.name, description: input.description, isPublic })
    if (id) {
      router.push(`/project/${id}/edit`)
      return
    }

    if (cloudRequiresLogin) setIsLoginOpen(true)
  }

  function handleDelete(id: string) {
    deleteProject(id)
    setProjectsData((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Carregando projetos...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Projetos</h1>
          {sorted.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">{sorted.length} projeto{sorted.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-3.5 py-2 text-sm font-semibold text-slate-900"
          onClick={() => setIsCreateOpen(true)}
        >
          <IconPlus />
          Novo projeto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <CreateProjectModal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={(input) => { setIsCreateOpen(false); void handleCreate(input) }}
        />
        <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Entrar para salvar na nuvem" />

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8">
              <IconFolder className="text-slate-600 mx-auto" />
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Nenhum projeto ainda</p>
              <p className="text-slate-600 text-sm">Crie seu primeiro projeto para começar a planejar</p>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2.5 text-sm font-semibold text-slate-900"
              onClick={() => setIsCreateOpen(true)}
            >
              <IconPlus />
              Criar projeto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((meta) => (
              <ProjectCard
                key={meta.id}
                meta={meta}
                data={projectsData[meta.id] ?? null}
                multiMachines={multiMachines}
                onDelete={handleDelete}
              />
            ))}

            <button
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors text-slate-600 hover:text-amber-500 min-h-[220px]"
              onClick={() => setIsCreateOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-medium">Novo projeto</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

type CommunityProjectMeta = {
  id: string
  name: string
  description: string
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

function CommunitySection() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CommunityProjectMeta[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() as Promise<CommunityProjectMeta[]> : Promise.reject(new Error('bad status')))
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Não foi possível carregar os projetos da comunidade.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Carregando comunidade...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Comunidade</h1>
          <p className="text-xs text-slate-500 mt-0.5">Projetos públicos publicados pela comunidade</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8">
              <IconFolder className="text-slate-600 mx-auto" />
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Nenhum projeto público ainda</p>
              <p className="text-slate-600 text-sm">Quando alguém publicar, ele vai aparecer aqui</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((p) => (
              <button
                key={p.id}
                className="text-left group relative flex flex-col rounded-xl border border-slate-700 bg-slate-900 overflow-hidden hover:border-slate-600 transition-colors p-4"
                onClick={() => router.push(`/project/${p.id}/view`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{p.name}</p>
                  <span className="text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    Público
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{p.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-600">Abrir visualização</span>
                  <span className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">/view</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsSection() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-6 border-b border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-slate-100">Configurações</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Configurações</p>
      </div>
    </div>
  )
}

function UserSection() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loginOpen, setLoginOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState<null | { level: number; points: number }>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportCloudProjects = useProjectStore((s) => s.exportCloudProjects)

  const username = (session?.user as unknown as { username?: string } | undefined)?.username
    ?? null

  useEffect(() => {
    if (!session?.user) return
    let cancelled = false
    setStatsError(null)
    fetch('/api/me/stats')
      .then((r) => (r.ok ? (r.json() as Promise<{ level: number; points: number }>) : Promise.reject(new Error('bad'))))
      .then((json) => { if (!cancelled) setStats({ level: Number(json.level ?? 1), points: Number(json.points ?? 0) }) })
      .catch(() => { if (!cancelled) setStatsError('Não foi possível carregar sua pontuação.') })
    return () => { cancelled = true }
  }, [session?.user])

  const statsLabel = useMemo(() => {
    if (stats) return `Nível ${stats.level} · ${stats.points} pts`
    return 'Carregando pontuação...'
  }, [stats])

  async function handleExportCloud() {
    if (exporting) return
    setExporting(true)
    const json = await exportCloudProjects().catch(() => null)
    setExporting(false)
    if (!json) return
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satisfactory-planner-export-${new Date().toISOString().slice(0, 10)}.json`
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
              <p className="text-sm font-semibold text-slate-100">
                {session.user.name ?? 'Conta'}
              </p>
              {session.user.email && <p className="text-xs text-slate-500 mt-1">{session.user.email}</p>}
              {username && <p className="text-xs text-slate-500 mt-1">@{username}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <p className={stats ? 'text-slate-400' : 'text-slate-600'}>{statsLabel}</p>
                {statsError && <p className="text-amber-300">{statsError}</p>}
              </div>
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
                onClick={() => { if (username) router.push(`/u/@${username}`) }}
              >
                Meu perfil
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors disabled:opacity-60"
                disabled={exporting}
                onClick={() => { void handleExportCloud() }}
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
                onClick={() => void signOut({ redirect: false })}
              >
                Sair
              </button>
            </div>

            {editing && <EditProfileForm />}

            {!username && (
              <p className="text-xs text-amber-300">
                Seu username ainda não está definido. (MVP: vamos definir no cadastro/login.)
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-500 text-sm">Faça login para salvar projetos na nuvem e interagir com a comunidade.</p>
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

export function HomeClient({ multiMachines }: HomeClientProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('projects')

  return (
    <div className="flex h-screen bg-[#0f1117]">
      <Sidebar active={activeSection} onSelect={setActiveSection} />

      <main className="flex-1 min-w-0 overflow-hidden">
        {activeSection === 'projects' && <ProjectsSection multiMachines={multiMachines} />}
        {activeSection === 'community' && <CommunitySection />}
        {activeSection === 'settings' && <SettingsSection />}
        {activeSection === 'user' && <UserSection />}
      </main>
    </div>
  )
}
