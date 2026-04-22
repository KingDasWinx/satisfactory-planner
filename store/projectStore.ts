'use client'

import { create } from 'zustand'
import type { Edge } from '@xyflow/react'
import type { ProjectMeta, ProjectData } from '@/lib/types/projects'
import type { FactoryNode } from '@/lib/types/store'

const STORAGE_INDEX = 'satisfactory-planner:projects'
const STORAGE_ACTIVE = 'satisfactory-planner:active-project'

function storageKey(id: string) {
  return `satisfactory-planner:project:${id}`
}

function randomId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function readIndex(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX)
    return raw ? (JSON.parse(raw) as ProjectMeta[]) : []
  } catch {
    return []
  }
}

function writeIndex(projects: ProjectMeta[]) {
  localStorage.setItem(STORAGE_INDEX, JSON.stringify(projects))
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
const COMPUTED_KEYS = new Set(['incomingSupply', 'outgoingDemand'])

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

  // Retorna o ProjectData do projeto ativo para o auto-save usar
  saveActiveProject: (nodes: FactoryNode[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => void
  loadProject: (id: string) => ProjectData | null
  createProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => string | null  // retorna novo activeId ou null
  setActiveProjectId: (id: string) => void
  hydrateFromStorage: () => { activeId: string | null; data: ProjectData | null }
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,

  hydrateFromStorage: () => {
    const projects = readIndex()
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
    writeIndex(updatedProjects)
    set({ projects: updatedProjects })
  },

  loadProject: (id) => {
    const data = readProjectData(id)
    if (!data) return null
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ activeProjectId: id })
    return data
  },

  createProject: (name) => {
    const id = randomId()
    const now = Date.now()
    const meta: ProjectMeta = { id, name, createdAt: now, updatedAt: now }
    const data: ProjectData = { meta, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    writeProjectData(data)
    const { projects } = get()
    const updated = [...projects, meta]
    writeIndex(updated)
    localStorage.setItem(STORAGE_ACTIVE, id)
    set({ projects: updated, activeProjectId: id })
    return id
  },

  renameProject: (id, name) => {
    const { projects } = get()
    const updated = projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    )
    writeIndex(updated)
    set({ projects: updated })
    // Atualiza também os dados persistidos
    const data = readProjectData(id)
    if (data) writeProjectData({ ...data, meta: { ...data.meta, name, updatedAt: Date.now() } })
  },

  deleteProject: (id) => {
    const { projects, activeProjectId } = get()
    localStorage.removeItem(storageKey(id))
    const updated = projects.filter((p) => p.id !== id)
    writeIndex(updated)
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
