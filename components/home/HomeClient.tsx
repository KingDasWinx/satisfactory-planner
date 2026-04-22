'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/projectStore'
import { ProjectCard } from './ProjectCard'
import type { ProjectData } from '@/lib/types/projects'
import type { MultiMachine } from '@/lib/types/game'

interface HomeClientProps {
  multiMachines: MultiMachine[]
}

type ActiveSection = 'projects' | 'settings' | 'user'

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
  const createProject = useProjectStore((s) => s.createProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const loadProject = useProjectStore((s) => s.loadProject)

  const [projectsData, setProjectsData] = useState<Record<string, ProjectData | null>>({})
  const [creatingName, setCreatingName] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
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

  function handleCreate() {
    const name = creatingName.trim() || 'Nova fábrica'
    const id = createProject(name)
    router.push(`/project/${id}/edit`)
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
          onClick={() => setShowNewInput(true)}
        >
          <IconPlus />
          Novo projeto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Input inline de criação */}
        {showNewInput && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="Nome do projeto..."
              value={creatingName}
              onChange={(e) => setCreatingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowNewInput(false); setCreatingName('') }
              }}
            />
            <button
              className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors"
              onClick={handleCreate}
            >
              Criar
            </button>
            <button
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => { setShowNewInput(false); setCreatingName('') }}
            >
              Cancelar
            </button>
          </div>
        )}

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
              onClick={() => setShowNewInput(true)}
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
              onClick={() => setShowNewInput(true)}
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-6 border-b border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-slate-100">Usuário</h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Em breve</p>
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
        {activeSection === 'settings' && <SettingsSection />}
        {activeSection === 'user' && <UserSection />}
      </main>
    </div>
  )
}
