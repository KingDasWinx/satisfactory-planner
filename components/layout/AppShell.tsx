'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LoginModal } from '@/components/auth/LoginModal'
import { useUiStore } from '@/store/uiStore'

function IconFactory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-amber-500">
      <path d="M2 20h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 20V13l3.5-3 3.5 3 3.5-3 3.5 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6V4M16 6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconAccount() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12h8M8 8h5M8 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AppShell() {
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const loginModalOpen = useUiStore((s) => s.loginModalOpen)
  const openLoginModal = useUiStore((s) => s.openLoginModal)
  const closeLoginModal = useUiStore((s) => s.closeLoginModal)
  const pendingAction = useUiStore((s) => s.pendingAction)
  const clearPendingAction = useUiStore((s) => s.clearPendingAction)
  const router = useRouter()
  const prevStatus = useRef(status)

  // Executa ação pendente (ex: fork) assim que o login é concluído
  useEffect(() => {
    const wasNotAuthenticated = prevStatus.current !== 'authenticated'
    prevStatus.current = status
    if (!wasNotAuthenticated || status !== 'authenticated' || !pendingAction) return

    if (pendingAction.type === 'fork') {
      const { projectId } = pendingAction
      clearPendingAction()
      fetch(`/api/projects/${encodeURIComponent(projectId)}/fork`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target: 'cloud' }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((json: { mode?: string; id?: string }) => {
          if (json.mode === 'cloud' && json.id) router.push(`/project/${json.id}/edit`)
        })
        .catch(() => {})
    }
  }, [status, pendingAction, clearPendingAction, router])

  const username = (session?.user as unknown as { username?: string } | undefined)?.username ?? null
  const displayName = session?.user?.name ?? username ?? null
  const isLoggedIn = status === 'authenticated' && !!session?.user

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <>
      <header className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-slate-800 bg-slate-900 z-20">
        <Link
          href="/home"
          className="flex items-center gap-2.5 text-sm font-bold text-slate-100 hover:text-amber-400 transition-colors"
        >
          <IconFactory />
          <span>Satisfactory Planner</span>
        </Link>

        <div className="ml-auto relative" ref={dropdownRef}>
          {isLoggedIn ? (
            <>
              {/* Botão do usuário logado */}
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={displayName ?? 'avatar'}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <IconUser />
                  </div>
                )}
                <span className="truncate max-w-[120px]">{displayName}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden
                  className={`shrink-0 text-slate-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40 py-1 z-50">
                  {username && (
                    <Link
                      href={`/u/@${username}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    >
                      <IconProfile />
                      View public profile
                    </Link>
                  )}
                  {username && (
                    <Link
                      href={`/u/@${username}?tab=conta`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    >
                      <IconAccount />
                      My account
                    </Link>
                  )}
                  {username && (
                    <Link
                      href={`/u/@${username}?tab=editar`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    >
                      <IconSettings />
                      Profile settings
                    </Link>
                  )}
                  <div className="my-1 h-px bg-slate-800" />
                  <button
                    onClick={() => { setDropdownOpen(false); void signOut({ callbackUrl: '/home' }) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                  >
                    <IconLogout />
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Botão Entrar para deslogados */
            <button
              onClick={() => openLoginModal()}
              className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-400 transition-colors"
            >
              <IconUser />
              Sign in
            </button>
          )}
        </div>
      </header>

      <LoginModal open={loginModalOpen} onClose={closeLoginModal} />
    </>
  )
}
