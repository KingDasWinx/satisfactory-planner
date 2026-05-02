'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  title?: string
}

// ─── Ícones ────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconFactory() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="text-amber-500">
      <path d="M2 20h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 20V13l3.5-3 3.5 3 3.5-3 3.5 3v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6V4M16 6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconGitHub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function IconGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconEye({ closed }: { closed?: boolean }) {
  return closed ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconAt() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="text-slate-500">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 12a8 8 0 1 0-2.8 6.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export function LoginModal({ open, onClose }: LoginModalProps) {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => setAvailableProviders(new Set(Object.keys(data))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) return
    setEmail('')
    setPassword('')
    setName('')
    setUsername('')
    setMode('login')
    setError(null)
    setLoading(false)
    setShowPassword(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password])
  const canRegister = useMemo(
    () => canSubmit && password.length >= 8 && username.trim().length >= 3,
    [canSubmit, password.length, username],
  )

  async function handleSubmit() {
    if (loading) return
    const isValid = mode === 'login' ? canSubmit : canRegister
    if (!isValid) return

    setLoading(true)
    setError(null)

    if (mode === 'register') {
      const rr = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, name, username }),
      }).catch(() => null)
      if (!rr?.ok) {
        setLoading(false)
        setError(rr?.status === 409 ? 'E-mail ou username já cadastrado.' : 'Não foi possível criar a conta.')
        return
      }
    }

    try {
      const res = await signIn('credentials', { redirect: false, email, password })
      setLoading(false)
      // Auth.js v5 retorna HTTP 200 mesmo em falha — checar error, ok e url
      const failed = res?.error || !res?.ok || res?.url?.includes('error=')
      if (failed) setError('E-mail ou senha inválidos.')
      else onClose()
    } catch {
      setLoading(false)
      setError('E-mail ou senha inválidos.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10001]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-[#0f1117] shadow-2xl shadow-black/80"
        >
          {/* Header */}
          <div className="relative flex flex-col items-center pt-8 pb-5 px-6">
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <IconX />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <IconFactory />
            </div>

            <h2 id={titleId} className="text-lg font-bold text-slate-100 text-center leading-tight">
              Satisfactory Planner
            </h2>
            <p className="text-sm text-slate-500 mt-1 text-center">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta grátis'}
            </p>
          </div>

          {/* Tabs Login / Criar conta */}
          <div className="px-6 mb-5">
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null) }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    mode === m
                      ? 'bg-slate-700 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          </div>

          {/* OAuth — só exibe se o provedor estiver configurado */}
          {(availableProviders.has('github') || availableProviders.has('google')) && (
            <>
              <div className={`px-6 mb-5 grid gap-3 ${availableProviders.has('github') && availableProviders.has('google') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {availableProviders.has('github') && (
                  <button
                    type="button"
                    onClick={() => void signIn('github')}
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors"
                  >
                    <IconGitHub />
                    GitHub
                  </button>
                )}
                {availableProviders.has('google') && (
                  <button
                    type="button"
                    onClick={() => void signIn('google')}
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors"
                  >
                    <IconGoogle />
                    Google
                  </button>
                )}
              </div>

              {/* Divisor só aparece se há OAuth + formulário */}
              <div className="px-6 mb-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[11px] text-slate-600 font-medium tracking-wide uppercase">ou com e-mail</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            </>
          )}

          {/* Formulário */}
          <div className="px-6 space-y-3">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 8v4M12 16v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <>
                {/* Nome */}
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                    <IconUser />
                  </div>
                  <input
                    className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-amber-500/70 focus:bg-slate-800/60 placeholder-slate-600 transition-colors"
                    placeholder="Seu nome (opcional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Username */}
                <div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                      <IconAt />
                    </div>
                    <input
                      className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-amber-500/70 focus:bg-slate-800/60 placeholder-slate-600 transition-colors"
                      placeholder="seu_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 ml-1">3–20 chars: letras, números e _</p>
                </div>
              </>
            )}

            {/* E-mail */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                <IconMail />
              </div>
              <input
                autoFocus
                type="email"
                className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-amber-500/70 focus:bg-slate-800/60 placeholder-slate-600 transition-colors"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Senha */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                  <IconLock />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-slate-900 border border-slate-800 text-sm text-slate-200 rounded-xl pl-9 pr-10 py-2.5 outline-none focus:border-amber-500/70 focus:bg-slate-800/60 placeholder-slate-600 transition-colors"
                  placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Sua senha'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit() }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconEye closed={showPassword} />
                </button>
              </div>
            </div>
          </div>

          {/* Botão principal */}
          <div className="px-6 mt-5 mb-6">
            <button
              type="button"
              disabled={(mode === 'login' ? !canSubmit : !canRegister) || loading}
              onClick={() => void handleSubmit()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/25 disabled:text-amber-900/50 transition-colors px-4 py-3 text-sm font-semibold text-slate-900"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {mode === 'register' ? 'Criando conta...' : 'Entrando...'}
                </>
              ) : (
                <>
                  {mode === 'register' ? 'Criar conta e entrar' : 'Entrar'}
                  <IconArrow />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
