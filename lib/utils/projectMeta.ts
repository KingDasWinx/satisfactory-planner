import type { ProjectMeta, ProjectVisibility } from '@/lib/types/projects'

export function visibilityToIsPublic(v: ProjectVisibility): boolean {
  return v === 'community'
}

export function normalizeProjectMeta(
  meta: ProjectMeta,
): ProjectMeta & { description: string; isPublic: boolean; storage: 'local' | 'cloud' } {
  return {
    ...meta,
    description: meta.description ?? '',
    isPublic: meta.isPublic ?? false,
    storage: meta.storage ?? 'local',
  }
}

