import type { ProjectMeta } from '@/lib/types/projects'
import { normalizeProjectMeta } from '@/lib/utils/projectMeta'

export const STORAGE_INDEX = 'satisfactory-planner:projects'
export const STORAGE_ACTIVE = 'satisfactory-planner:active-project'

export function migrateIndex(storage: Storage): (ProjectMeta & { description: string; isPublic: boolean; storage: 'local' | 'cloud' })[] {
  const raw = storage.getItem(STORAGE_INDEX)
  let parsed: ProjectMeta[] = []
  try {
    parsed = raw ? (JSON.parse(raw) as ProjectMeta[]) : []
  } catch {
    parsed = []
  }

  const migrated = parsed.map((m) => normalizeProjectMeta(m))
  const rawNext = JSON.stringify(migrated)
  if (rawNext !== raw) storage.setItem(STORAGE_INDEX, rawNext)
  return migrated
}

