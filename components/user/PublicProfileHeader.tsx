'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FollowButton } from './FollowButton'

function IconStar() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

interface PublicProfileHeaderProps {
  username: string
  name: string | null
  image: string | null
  bio: string
  level: number
  badges: string[]
  counts: { followers: number; following: number; publicProjects: number }
  isFollowing: boolean
  isBlocked: boolean
  isMe: boolean
  isLoggedIn: boolean
  isPrivate: boolean
  activeTab: string
}

function initials(nameOrUsername: string): string {
  const parts = nameOrUsername.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const PUBLIC_TABS = [
  { key: 'destaques', label: 'Featured' },
  { key: 'projetos', label: 'Projects' },
  { key: 'seguidores', label: 'Followers' },
  { key: 'seguindo', label: 'Following' },
]

// ─── Menu de ações (⋯) ─────────────────────────────────────────────────────

function UserActionsMenu({ username, initialIsBlocked }: { username: string; initialIsBlocked: boolean }) {
  const [open, setOpen] = useState(false)
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  async function toggleBlock() {
    setLoading(true)
    setOpen(false)
    const res = await fetch(`/api/users/${encodeURIComponent(username)}/block`, {
      method: isBlocked ? 'DELETE' : 'POST',
    }).catch(() => null)
    setLoading(false)
    if (res?.ok) setIsBlocked((v) => !v)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40 py-1 z-50">
          <button
            type="button"
            onClick={() => void toggleBlock()}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
              isBlocked
                ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {isBlocked ? 'Unblock user' : 'Block user'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

function IconCamera() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

async function resizeToBase64(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')) }
    img.src = url
  })
}

export function PublicProfileHeader({
  username,
  name,
  image,
  bio,
  level,
  badges,
  counts,
  isFollowing,
  isBlocked,
  isMe,
  isLoggedIn,
  isPrivate,
  activeTab,
}: PublicProfileHeaderProps) {
  const router = useRouter()
  const label = name?.trim() || `@${username}`
  const base = `/u/@${username}`

  const [avatarSrc, setAvatarSrc] = useState<string | null>(image)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const base64 = await resizeToBase64(file, 256)
      const res = await fetch('/api/me/avatar', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (res.ok) {
        setAvatarSrc(base64)
        router.refresh()
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Banner */}
      <div className="relative h-32 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0f1117]" />

      {/* Avatar overlap */}
      <div className="relative px-6">
        <div className="absolute -top-10 left-6 w-20 h-20">
          {isMe && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          )}
          <div
            className={`relative w-full h-full rounded-full ring-4 ring-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center ${isMe ? 'cursor-pointer group/avatar' : ''}`}
            onClick={isMe ? () => fileInputRef.current?.click() : undefined}
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={label} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-slate-300">{initials(label)}</span>
            )}
            {isMe && (
              <div className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100'}`}>
                {uploading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <span className="text-white"><IconCamera /></span>
                }
              </div>
            )}
          </div>
        </div>

        {/* Ações alinhadas à direita do banner */}
        {!isMe && (
          <div className="flex items-center justify-end gap-2 pt-3 pb-2">
            <FollowButton username={username} initialIsFollowing={isFollowing} />
            {isLoggedIn && (
              <UserActionsMenu username={username} initialIsBlocked={isBlocked} />
            )}
          </div>
        )}
      </div>

      {/* Informações do perfil */}
      <div className="px-6 pt-12 pb-4 space-y-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{name?.trim() || 'User'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">@{username}</p>
          {bio && <p className="text-sm text-slate-400 mt-2 leading-relaxed">{bio}</p>}
        </div>

        {/* Level + badges */}
        {(level >= 1 || (badges && badges.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {level >= 1 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 font-medium">
                <IconStar />
                Level {level}
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
            <b className="text-slate-100 font-semibold">{counts.publicProjects}</b> projects
          </Link>
          <Link href={`${base}?tab=seguidores`} className="text-slate-400 hover:text-amber-400 transition-colors">
            <b className="text-slate-100 font-semibold">{counts.followers}</b> followers
          </Link>
          <Link href={`${base}?tab=seguindo`} className="text-slate-400 hover:text-amber-400 transition-colors">
            <b className="text-slate-100 font-semibold">{counts.following}</b> following
          </Link>
        </div>
      </div>

      {/* Tab navigation — oculta em perfis privados de terceiros */}
      {(isMe || !isPrivate) ? (
        <div className="border-t border-slate-800 flex overflow-x-auto">
          {PUBLIC_TABS.map((tab) => (
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
            <>
              <Link
                href={`${base}?tab=conta`}
                className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'conta'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                My account
              </Link>
              <Link
                href={`${base}?tab=editar`}
                className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'editar'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Edit profile
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
