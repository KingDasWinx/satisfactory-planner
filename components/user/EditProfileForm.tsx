'use client'

import { useEffect, useMemo, useState } from 'react'

type Links = {
  github?: string
  youtube?: string
  discord?: string
  site?: string
}

interface EditProfileFormProps {
  initialBio?: string
  initialIsPrivate?: boolean
  initialLinks?: Links
}

export function EditProfileForm({ initialBio = '', initialIsPrivate = false, initialLinks = {} }: EditProfileFormProps) {
  const [bio, setBio] = useState(initialBio)
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
  const [links, setLinks] = useState<Links>(initialLinks)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // sync only when the component is remounted (key-based reset from parent)
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
    if (!res) { setMsg('Network error.'); return }
    if (res.status === 401) { setMsg('Sign in to edit your profile.'); return }
    if (!res.ok) { setMsg('Could not save.'); return }
    setMsg('Saved.')
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-100">Edit profile</p>
        <p className="text-xs text-slate-500 mt-0.5">Bio, privacidade e links.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300">Bio</label>
        <textarea
          className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500 min-h-[90px] resize-none"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="text-[11px] text-slate-500">{bio.trim().length}/160</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-300">Private profile</p>
          <p className="text-[11px] text-slate-500">If enabled, visitors only see your avatar + @username.</p>
        </div>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            isPrivate ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
          onClick={() => setIsPrivate((v) => !v)}
        >
          {isPrivate ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['github', 'youtube', 'discord', 'site'] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">{k.toUpperCase()}</label>
            <input
              className="w-full bg-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 outline-none border border-slate-700 focus:border-amber-500"
              placeholder="https://..."
              value={links[k] ?? ''}
              onChange={(e) => setLinks((prev) => ({ ...prev, [k]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        {msg && <p className="text-xs text-slate-500 mr-auto">{msg}</p>}
        <button
          type="button"
          disabled={!canSave || loading}
          onClick={save}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-4 py-2 text-sm font-semibold text-slate-900"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

