import type { Edge } from '@xyflow/react'
import type { FactoryNode } from './store'

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface ProjectData {
  meta: ProjectMeta
  nodes: FactoryNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number }
}
