'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  title?: string
}

export function LoginModal({ open, onClose, title = 'Entrar' }: LoginModalProps) {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setPassword('')
    setName('')
    setUsername('')
    setMode('login')
    setError(null)
    setLoading(false)
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
  const canRegister = useMemo(() => canSubmit && password.length >= 8 && username.trim().length >= 3, [canSubmit, password.length, username])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10001]">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-sm font-bold text-slate-100 leading-tight">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Login é necessário apenas para salvar na nuvem.</p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'login' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => { setMode('login'); setError(null) }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === 'register' ? 'bg-amber-500/15 text-amber-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => { setMode('register'); setError(null) }}
              >
                Criar conta
              </button>
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-name`}>Nome (opcional)</label>
                  <input
                    id={`${titleId}-name`}
                    className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-username`}>Username</label>
                  <input
                    id={`${titleId}-username`}
                    className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
                    placeholder="seu_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">3–20 chars: letras, números e _</p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-email`}>E-mail</label>
              <input
                id={`${titleId}-email`}
                autoFocus
                className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor={`${titleId}-pass`}>Senha</label>
              <input
                id={`${titleId}-pass`}
                className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  if ((!canSubmit && mode === 'login') || (!canRegister && mode === 'register') || loading) return
                  void (async () => {
                    setLoading(true)
                    setError(null)
                    if (mode === 'register') {
                      const rr = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ email, password, name, username }),
                      })
                      if (!rr.ok) {
                        const msg = rr.status === 409 ? 'E-mail ou username já cadastrado.' : 'Não foi possível criar a conta.'
                        setLoading(false)
                        setError(msg)
                        return
                      }
                    }
                    const res = await signIn('credentials', { redirect: false, email, password })
                    setLoading(false)
                    if (!res?.ok) setError('E-mail ou senha inválidos.')
                    else onClose()
                  })()
                }}
              />
              {mode === 'register' && (
                <p className="text-[11px] text-slate-500">Mínimo de 8 caracteres.</p>
              )}
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={() => void signIn('github')}
            >
              GitHub
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              onClick={() => void signIn('google')}
            >
              Google
            </button>
            <button
              type="button"
              disabled={(mode === 'login' ? !canSubmit : !canRegister) || loading}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-4 py-2 text-sm font-semibold text-slate-900"
              onClick={() => {
                void (async () => {
                  setLoading(true)
                  setError(null)
                  if (mode === 'register') {
                    const rr = await fetch('/api/auth/register', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ email, password, name, username }),
                    })
                    if (!rr.ok) {
                      const msg = rr.status === 409 ? 'E-mail ou username já cadastrado.' : 'Não foi possível criar a conta.'
                      setLoading(false)
                      setError(msg)
                      return
                    }
                  }
                  const res = await signIn('credentials', { redirect: false, email, password })
                  setLoading(false)
                  if (!res?.ok) setError('E-mail ou senha inválidos.')
                  else onClose()
                })()
              }}
            >
              {loading ? (mode === 'register' ? 'Criando...' : 'Entrando...') : (mode === 'register' ? 'Criar e entrar' : 'Entrar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

