'use client'

import Link from 'next/link'
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
  activeTab: string
}

function initials(nameOrUsername: string): string {
  const parts = nameOrUsername.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const TABS = [
  { key: 'destaques', label: 'Destaques' },
  { key: 'projetos', label: 'Projetos' },
  { key: 'seguidores', label: 'Seguidores' },
  { key: 'seguindo', label: 'Seguindo' },
]

export function PublicProfileHeader({
  username,
  name,
  image,
  bio,
  level,
  badges,
  counts,
  isFollowing,
  isMe,
  activeTab,
}: PublicProfileHeaderProps) {
  const label = name?.trim() || `@${username}`
  const base = `/u/@${username}`

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0f1117]">
        {isMe && (
          <Link
            href={`${base}?tab=editar`}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Editar perfil
          </Link>
        )}
      </div>

      {/* Avatar overlap */}
      <div className="relative px-6">
        <div className="absolute -top-10 left-6 w-20 h-20 rounded-full ring-4 ring-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-slate-300">{initials(label)}</span>
          )}
        </div>

        {/* Follow button aligned to right of banner */}
        {!isMe && (
          <div className="flex justify-end pt-3 pb-2">
            <FollowButton username={username} initialIsFollowing={isFollowing} />
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className={`px-6 ${isMe ? 'pt-12' : 'pt-2'} pb-4 space-y-3`}>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{name?.trim() || 'Usuário'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">@{username}</p>
          {bio && <p className="text-sm text-slate-400 mt-2 leading-relaxed">{bio}</p>}
        </div>

        {/* Level + badges */}
        {(level > 1 || (badges && badges.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {level > 1 && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 font-medium">
                ⭐ Nível {level}
              </span>
            )}
            {badges?.map((badge) => (
              <span key={badge} className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-5 text-sm">
          <Link href={`${base}?tab=projetos`} className="text-slate-400 hover:text-amber-400 transition-colors">
            <b className="text-slate-100 font-semibold">{counts.publicProjects}</b> projetos
          </Link>
          <Link href={`${base}?tab=seguidores`} className="text-slate-400 hover:text-amber-400 transition-colors">
            <b className="text-slate-100 font-semibold">{counts.followers}</b> seguidores
          </Link>
          <Link href={`${base}?tab=seguindo`} className="text-slate-400 hover:text-amber-400 transition-colors">
            <b className="text-slate-100 font-semibold">{counts.following}</b> seguindo
          </Link>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-t border-slate-800 flex overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`${base}?tab=${tab.key}`}
            className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        {isMe && (
          <Link
            href={`${base}?tab=editar`}
            className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'editar'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Editar perfil
          </Link>
        )}
      </div>
    </div>
  )
}
