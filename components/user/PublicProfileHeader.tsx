'use client'

import { FollowButton } from './FollowButton'

interface PublicProfileHeaderProps {
  username: string
  name: string | null
  image: string | null
  bio: string
  counts: { followers: number; following: number; publicProjects: number }
  isFollowing: boolean
  isMe: boolean
}

function initials(nameOrUsername: string): string {
  const parts = nameOrUsername.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function PublicProfileHeader({ username, name, image, bio, counts, isFollowing, isMe }: PublicProfileHeaderProps) {
  const label = name?.trim() || `@${username}`
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-slate-300">{initials(label)}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100 truncate">{name?.trim() || 'Usuário'}</h1>
            <span className="text-sm text-slate-500 truncate">@{username}</span>
          </div>
          {bio && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{bio}</p>}

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span><b className="text-slate-200">{counts.publicProjects}</b> projetos</span>
            <span><b className="text-slate-200">{counts.followers}</b> seguidores</span>
            <span><b className="text-slate-200">{counts.following}</b> seguindo</span>
          </div>
        </div>
      </div>

      {!isMe && <FollowButton username={username} initialIsFollowing={isFollowing} />}
    </div>
  )
}

