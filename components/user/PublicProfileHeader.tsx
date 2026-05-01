'use client'

import { FollowButton } from './FollowButton'

interface PublicProfileHeaderProps {
  username: string
  name: string | null
  image: string | null
  bio: string
  level: number
  badges: string[]
  counts: { followers: number; following: number; publicProjects: number }
  isFollowing: boolean
  isMe: boolean
}

function initials(nameOrUsername: string): string {
  const parts = nameOrUsername.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function PublicProfileHeader({ username, name, image, bio, level, badges, counts, isFollowing, isMe }: PublicProfileHeaderProps) {
  const label = name?.trim() || `@${username}`
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
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

      {/* Level + Badges */}
      {(level > 1 || (badges && badges.length > 0)) && (
        <div className="border-t border-slate-800 pt-4 space-y-2">
          {level > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                ⭐ Nível {level}
              </span>
            </div>
          )}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span key={badge} className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

