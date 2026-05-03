'use client'

import Link from 'next/link'

function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconComment({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function formatRelativeTime(ms: number): string {
  const now = Date.now()
  const diff = now - ms
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)} months ago`
}

interface CommunityProjectCardProps {
  id: string
  name: string
  description: string
  ownerUsername: string
  ownerName: string | null
  ownerImage: string | null
  likeCount: number
  commentCount: number
  updatedAt: number
}

export function CommunityProjectCard({
  id,
  name,
  description,
  ownerUsername,
  ownerName,
  ownerImage,
  likeCount,
  commentCount,
  updatedAt,
}: CommunityProjectCardProps) {
  const initials = (ownerName || ownerUsername).substring(0, 2).toUpperCase()
  const hue = ownerUsername.charCodeAt(0) * 137 % 360
  const avatarColor = `hsl(${hue}, 35%, 40%)`
  const relativeDate = formatRelativeTime(updatedAt)

  return (
    <Link href={`/project/${id}/view`}>
      <div className="group relative flex flex-col rounded-xl border border-slate-700 bg-slate-900 transition-all hover:border-amber-500/30">
        {/* Content */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-sm font-semibold text-slate-100 truncate">{name}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
        </div>

        {/* Author row */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {ownerImage ? (
            <img
              src={ownerImage}
              alt={ownerName || ownerUsername}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              <span className="text-[10px] font-bold text-slate-300">{initials}</span>
            </div>
          )}
          <span className="text-xs text-slate-400 truncate">@{ownerUsername}</span>
          <span className="text-xs text-slate-600 ml-auto whitespace-nowrap">{relativeDate}</span>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 flex items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <IconHeart className="w-3.5 h-3.5" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <IconComment className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </div>
          <span className="text-xs text-slate-600 ml-auto">Open →</span>
        </div>
      </div>
    </Link>
  )
}
