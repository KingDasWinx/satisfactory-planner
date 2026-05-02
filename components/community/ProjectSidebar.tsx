'use client'

import Link from 'next/link'
import { LikeButton } from './LikeButton'
import { BookmarkButton } from './BookmarkButton'
import { CommentsPanel } from './CommentsPanel'
import { ForkButton } from './ForkButton'

interface ProjectSidebarProps {
  projectId: string
  projectName: string
  projectDescription: string
  ownerUsername: string
  ownerName: string | null
  ownerImage: string | null
  commentCount: number
  isOwner?: boolean
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProjectSidebar({
  projectId,
  projectName,
  projectDescription,
  ownerUsername,
  ownerName,
  ownerImage,
  commentCount,
  isOwner = false,
}: ProjectSidebarProps) {
  const ownerLabel = ownerName?.trim() || `@${ownerUsername}`

  return (
    <div className="flex flex-col h-full">
      {/* Voltar */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
        <Link
          href="/home?section=community"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <IconBack />
          Voltar para comunidade
        </Link>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Autor */}
        <Link href={`/u/@${ownerUsername}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-slate-800 ring-1 ring-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
            {ownerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ownerImage} alt={ownerLabel} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-slate-300">{initials(ownerLabel)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors truncate">
              {ownerLabel}
            </p>
            <p className="text-xs text-slate-500">@{ownerUsername}</p>
          </div>
        </Link>

        {/* Meta do projeto */}
        <div className="space-y-2">
          <h1 className="text-lg font-bold text-slate-100 leading-snug">{projectName}</h1>
          {projectDescription && (
            <p className="text-sm text-slate-400 leading-relaxed">{projectDescription}</p>
          )}
        </div>

        {/* Ações sociais */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <LikeButton projectId={projectId} />
            <BookmarkButton projectId={projectId} />
          </div>
          {!isOwner && <ForkButton projectId={projectId} />}
        </div>

        {/* Divisor */}
        <div className="h-px bg-slate-800" />

        {/* Comentários */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">
            {commentCount > 0 ? `Comentários (${commentCount})` : 'Comentários'}
          </h2>
          <CommentsPanel projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
