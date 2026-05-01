'use client'

import { useEffect, useMemo, useState } from 'react'

type Links = {
  github?: string
  youtube?: string
  discord?: string
  site?: string
}

interface EditProfilePanelProps {
  initialBio?: string
  initialIsPrivate?: boolean
  initialLinks?: Links
}

export function EditProfilePanel({
  initialBio = '',
  initialIsPrivate = false,
  initialLinks = {},
}: EditProfilePanelProps) {
  const [bio, setBio] = useState(initialBio)
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
  const [links, setLinks] = useState<Links>(initialLinks)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBio(initialBio); setIsPrivate(initialIsPrivate); setLinks(initialLinks) }, [])

  const canSave = useMemo(() => bio.trim().length <= 160, [bio])

  async function save() {
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/me/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bio, isPrivate, links, badges: [] }),
    }).catch(() => null)
    setLoading(false)
    if (!res) { setMsg({ text: 'Falha de rede.', ok: false }); return }
    if (res.status === 401) { setMsg({ text: 'Faça login para editar.', ok: false }); return }
    if (!res.ok) { setMsg({ text: 'Não foi possível salvar.', ok: false }); return }
    setMsg({ text: 'Perfil salvo com sucesso!', ok: true })
  }

  return (
    <div className="border-t border-slate-800 pt-6 space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Bio</label>
          <textarea
            className="w-full bg-slate-800 text-sm text-slate-200 rounded-xl px-4 py-3 outline-none border border-slate-700 focus:border-amber-500 min-h-[110px] resize-none transition-colors"
            placeholder="Conte um pouco sobre você..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="text-[11px] text-slate-500">{bio.trim().length}/160</p>
        </div>

        {/* Privacy + links */}
        <div className="space-y-4">
          {/* Privacy toggle */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-slate-300">Perfil privado</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Visitantes veem só avatar e @username.</p>
            </div>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors shrink-0 ${
                isPrivate
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
              onClick={() => setIsPrivate((v) => !v)}
            >
              {isPrivate ? 'Ativado' : 'Desativado'}
            </button>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['github', 'youtube', 'discord', 'site'] as const).map((k) => (
              <div key={k} className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{k}</label>
                <input
                  className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500 transition-colors"
                  placeholder="https://..."
                  value={links[k] ?? ''}
                  onChange={(e) => setLinks((prev) => ({ ...prev, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800">
        {msg ? (
          <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-300'}`}>{msg.text}</p>
        ) : (
          <div />
        )}
        <button
          type="button"
          disabled={!canSave || loading}
          onClick={save}
          className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-5 py-2 text-sm font-semibold text-slate-900"
        >
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}
