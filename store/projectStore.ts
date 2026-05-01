'use client'

import { create } from 'zustand'
import type { Edge } from '@xyflow/react'
import type { ProjectMeta, ProjectData } from '@/lib/types/projects'
import type { FactoryNode } from '@/lib/types/store'
import { migrateIndex, STORAGE_ACTIVE, STORAGE_INDEX } from '@/lib/utils/projectStorage'

function storageKey(id: string) {
  return `satisfactory-planner:project:${id}`
}

function randomId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function readProjectData(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(storageKey(id))
    return raw ? (JSON.parse(raw) as ProjectData) : null
  } catch {
    return null
  }
}

function writeProjectData(data: ProjectData) {
  localStorage.setItem(storageKey(data.meta.id), JSON.stringify(data))
}

// Campos computados que não devem ser persistidos
const COMPUTED_KEYS = new Set([
  'incomingSupply',
  'outgoingDemand',
  'incomingPotential',
  'effectiveRates',
  'efficiency',
  'autoNMachines',
  'magicAutoApplied',
  'createdByMagic',
])

function stripComputed(nodes: FactoryNode[]): FactoryNode[] {
  return nodes.map((n) => {
    const data = { ...n.data }
    for (const key of COMPUTED_KEYS) {
      delete (data as Record<string, unknown>)[key]
    }
    return { ...n, data } as FactoryNode
  })
}

type ProjectStore = {
  projects: ProjectMeta[]
  activeProjectId: string | null
  cloudRequiresLogin: boolean
  moveActiveProjectToCloud: () => Promise<string | null>
  exportCloudProjects: () => Promise<unknown | null>

  // Retorna o ProjectData do projeto ativo para o auto-save usar
  saveActiveProject: (nodes: FactoryNode[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => void
  loadProject: (id: string) => ProjectData | null
  createProjectLocal: (input: { name: string; description: string; isPublic: boolean }) => string
  createProjectCloud: (input: { name: string; description: string; isPublic: boolean }) => Promise<string | null>
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => string | null  // retorna novo activeId ou null
  setActiveProjectId: (id: string) => void
  hydrateFromStorage: () => { activeId: string | null; data: ProjectData | null }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  cloudRequiresLogin: false,

  hydrateFromStorage: () => {
    const projects = migrateIndex(localStorage)
    const activeId = localStorage.getItem(STORAGE_ACTIVE)
    set({ projects, activeProjectId: activeId ?? null })
    if (activeId) {
      const data = readProjectData(activeId)
      return { activeId, data }
    }
    return { activeId: null, data: null }
  },

  saveActiveProject: (nodes, edges, viewport) => {
    const { activeProjectId, projects } = get()
    if (!activeProjectId) return

    const meta = projects.find((p) => p.id === activeProjectId)
    if (!meta) return

    const updatedMeta: ProjectMeta = { ...meta, updatedAt: Date.now() }
    const data: ProjectData = {
      meta: updatedMeta,
      nodes: stripComputed(nodes),
      edges,
      viewport,
    }
    writeProjectData(data)
    const updatedProjects = projects.map((p) => (p.id === activeProjectId ? updatedMeta : p))
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updatedProjects))
    set({ projects: updatedProjects })

    if (meta.storage === 'cloud') {
      fetch(`/api/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data }),
      }).catch(() => {})
    }
  },

  loadProject: (id) => {
    const data = readProjectData(id)
    if (!data) return null
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ activeProjectId: id })
    return data
  },

  createProjectLocal: ({ name, description, isPublic }) => {
    const id = randomId()
    const now = Date.now()
    const meta: ProjectMeta = { id, name, description, isPublic, storage: 'local', createdAt: now, updatedAt: now }
    const data: ProjectData = { meta, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    writeProjectData(data)
    const { projects } = get()
    const updated = [...projects, meta]
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updated))
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ projects: updated, activeProjectId: id })
    return id
  },

  createProjectCloud: async ({ name, description, isPublic }) => {
    set({ cloudRequiresLogin: false })
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, description, visibility: isPublic ? 'COMMUNITY' : 'PRIVATE' }),
    }).catch(() => null)

    if (!res || res.status === 401) {
      set({ cloudRequiresLogin: true })
      return null
    }
    if (!res.ok) return null

    const json = (await res.json().catch(() => null)) as null | { id?: unknown }
    const id = typeof json?.id === 'string' ? json.id : null
    if (!id) return null

    const now = Date.now()
    const meta: ProjectMeta = { id, name, description, isPublic, storage: 'cloud', createdAt: now, updatedAt: now }
    const data: ProjectData = { meta, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    writeProjectData(data)
    const { projects } = get()
    const updated = [...projects, meta]
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updated))
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ projects: updated, activeProjectId: id })
    return id
  },

  moveActiveProjectToCloud: async () => {
    set({ cloudRequiresLogin: false })
    const { activeProjectId, projects } = get()
    if (!activeProjectId) return null
    const meta = projects.find((p) => p.id === activeProjectId)
    if (!meta) return null
    const data = readProjectData(activeProjectId)
    if (!data) return null

    const res = await fetch('/api/me/projects/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        meta: { name: meta.name, description: meta.description ?? '', isPublic: meta.isPublic ?? false },
        data,
      }),
    }).catch(() => null)

    if (!res || res.status === 401) {
      set({ cloudRequiresLogin: true })
      return null
    }
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as null | { id?: unknown }
    const id = typeof json?.id === 'string' ? json.id : null
    if (!id) return null

    // Marca a cópia cloud no index local
    const now = Date.now()
    const cloudMeta: ProjectMeta = { id, name: meta.name, description: meta.description, isPublic: meta.isPublic, storage: 'cloud', createdAt: now, updatedAt: now }
    const cloudData: ProjectData = { ...data, meta: { ...cloudMeta } }
    writeProjectData(cloudData)
    const updated = [...projects, cloudMeta]
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updated))
    set({ projects: updated })
    return id
  },

  exportCloudProjects: async () => {
    const res = await fetch('/api/me/projects/export').catch(() => null)
    if (!res || !res.ok) return null
    return await res.json().catch(() => null)
  },

  renameProject: (id, name) => {
    const { projects } = get()
    const updated = projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    )
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updated))
    set({ projects: updated })
    // Atualiza também os dados persistidos
    const data = readProjectData(id)
    if (data) writeProjectData({ ...data, meta: { ...data.meta, name, updatedAt: Date.now() } })
  },

  deleteProject: (id) => {
    const { projects, activeProjectId } = get()
    localStorage.removeItem(storageKey(id))
    const updated = projects.filter((p) => p.id !== id)
    localStorage.setItem(STORAGE_INDEX, JSON.stringify(updated))
    let newActiveId = activeProjectId === id
      ? (updated[0]?.id ?? null)
      : activeProjectId
    if (newActiveId) {
      localStorage.setItem(STORAGE_ACTIVE, newActiveId)
    } else {
      localStorage.removeItem(STORAGE_ACTIVE)
    }
    set({ projects: updated, activeProjectId: newActiveId })
    return newActiveId
  },

  setActiveProjectId: (id) => {
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ activeProjectId: id })
  },
}))
