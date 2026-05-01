import type { Edge } from '@xyflow/react'
import type { FactoryNode } from './store'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  // Campos para comunidade futura — opcionais para manter compatibilidade com dados existentes
  description?: string
  tags?: string[]
  isPublic?: boolean
  authorName?: string
  storage?: 'local' | 'cloud'
}

export type ProjectVisibility = 'private' | 'community'

export interface CreateProjectInput {
  name: string
  description: string
  visibility: ProjectVisibility
}

export type ProjectSaveTarget = 'local' | 'cloud'

export interface CreateProjectFormInput extends CreateProjectInput {
  saveTarget: ProjectSaveTarget
}

export interface ProjectData {
  meta: ProjectMeta
  nodes: FactoryNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}
