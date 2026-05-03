'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { ProjectCard } from './ProjectCard'
import { CreateProjectModal } from './CreateProjectModal'
import { LoginModal } from '@/components/auth/LoginModal'
import { CommunityProjectCard } from '@/components/community/CommunityProjectCard'
import { SettingsSection } from './SettingsSection'
import { NavSidebar, type NavSection } from '@/components/layout/NavSidebar'
import type { ProjectData } from '@/lib/types/projects'
import type { MultiMachine } from '@/lib/types/game'
import { visibilityToIsPublic } from '@/lib/utils/projectMeta'

interface HomeClientProps {
  multiMachines: MultiMachine[]
}

type ActiveSection = NavSection

function IconFolder({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
        Loading projects...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Projects</h1>
          {sorted.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">{sorted.length} project{sorted.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-3.5 py-2 text-sm font-semibold text-slate-900"
          onClick={() => setIsCreateOpen(true)}
        >
          <IconPlus />
          New project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <CreateProjectModal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={(input) => { setIsCreateOpen(false); void handleCreate(input) }}
        />
        <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Sign in to save to cloud" />

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8">
              <IconFolder className="text-slate-600 mx-auto" />
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">No projects yet</p>
              <p className="text-slate-600 text-sm">Create your first project to start planning</p>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors px-4 py-2.5 text-sm font-semibold text-slate-900"
              onClick={() => setIsCreateOpen(true)}
            >
              <IconPlus />
              Create project
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
              <span className="text-sm font-medium">New project</span>
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
  ownerUsername: string
  ownerName: string | null
  ownerImage: string | null
  likeCount: number
  commentCount: number
}

function CommunitySectionInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSort = (searchParams.get('sort') as 'recent' | 'top') ?? 'recent'

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CommunityProjectMeta[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<'recent' | 'top'>(initialSort)

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
        setError('Could not load community projects.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleSortChange(s: 'recent' | 'top') {
    setSort(s)
    router.replace(`/home?section=community&sort=${s}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 text-sm">
        Loading community...
      </div>
    )
  }

  const sorted = sort === 'top'
    ? [...items].sort((a, b) => b.likeCount - a.likeCount)
    : [...items].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Community</h1>
          <p className="text-xs text-slate-500 mt-0.5">Public projects published by the community</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="px-8 py-3 border-b border-slate-800 shrink-0 flex items-center gap-2">
          <button
            onClick={() => handleSortChange('recent')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              sort === 'recent'
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => handleSortChange('top')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              sort === 'top'
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            Most liked
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-8">
              <IconGlobe className="text-slate-600 mx-auto" />
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">No public projects yet</p>
              <p className="text-slate-600 text-sm">When someone publishes, it will appear here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map((p) => (
              <CommunityProjectCard
                key={p.id}
                id={p.id}
                name={p.name}
                description={p.description}
                ownerUsername={p.ownerUsername}
                ownerName={p.ownerName}
                ownerImage={p.ownerImage}
                likeCount={p.likeCount}
                commentCount={p.commentCount}
                updatedAt={p.updatedAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommunitySection() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-600 text-sm">Loading community...</div>}>
      <CommunitySectionInner />
    </Suspense>
  )
}

function HomeClientInner({ multiMachines }: HomeClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSection = (searchParams.get('section') as ActiveSection) ?? 'projects'
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection)
  const [loginOpen, setLoginOpen] = useState(false)

  function handleSelect(s: ActiveSection) {
    setActiveSection(s)
    router.replace(`/home?section=${s}`, { scroll: false })
  }

  return (
    <div className="flex h-full bg-[#0f1117]">
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <NavSidebar activeSection={activeSection} onSelect={handleSelect} />

      <main className="flex-1 min-w-0 overflow-hidden">
        {activeSection === 'projects' && <ProjectsSection multiMachines={multiMachines} />}
        {activeSection === 'community' && <CommunitySection />}
        {activeSection === 'settings' && <SettingsSection />}
      </main>
    </div>
  )
}

export function HomeClient({ multiMachines }: HomeClientProps) {
  return (
    <Suspense fallback={null}>
      <HomeClientInner multiMachines={multiMachines} />
    </Suspense>
  )
}
