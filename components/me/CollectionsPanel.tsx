'use client'

import { useEffect, useMemo, useState } from 'react'

type CollectionRow = { id: string; name: string; updatedAt: number; itemCount: number }

export function CollectionsPanel() {
  const [items, setItems] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canCreate = useMemo(() => name.trim().length > 0 && name.trim().length <= 60, [name])

  async function refresh() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/me/collections').catch(() => null)
    if (!res) { setLoading(false); setError('Network error.'); return }
    if (res.status === 401) { setLoading(false); setError('Sign in to view collections.'); return }
    if (!res.ok) { setLoading(false); setError('Could not load.'); return }
    const json = (await res.json().catch(() => null)) as unknown
    setItems(Array.isArray(json) ? (json as CollectionRow[]) : [])
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function create() {
    if (!canCreate || creating) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/me/collections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => null)
    setCreating(false)
    if (!res) { setError('Network error.'); return }
    if (res.status === 401) { setError('Sign in to create.'); return }
    if (!res.ok) { setError('Could not create.'); return }
    setName('')
    await refresh()
  }

  async function rename(id: string, nextName: string) {
    const trimmed = nextName.trim()
    if (!trimmed || trimmed.length > 60) return
    setError(null)
    const res = await fetch(`/api/me/collections/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => null)
    if (!res || !res.ok) { setError('Could not rename.'); return }
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)))
  }

  async function remove(id: string) {
    setError(null)
    const res = await fetch(`/api/me/collections/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null)
    if (!res || !res.ok) { setError('Could not delete.'); return }
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-100">Collections</h2>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-200"
          onClick={() => { void refresh() }}
        >
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
          placeholder="New collection..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="New collection name"
        />
        <button
          type="button"
          className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-slate-700 transition-colors px-3 py-2 text-sm font-semibold text-slate-900"
          disabled={!canCreate || creating}
          onClick={() => { void create() }}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>

      {error && <p className="text-xs text-amber-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-600">No collections yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c) => (
            <CollectionCard
              key={c.id}
              item={c}
              onRename={rename}
              onRemove={remove}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CollectionCard({
  item,
  onRename,
  onRemove,
}: {
  item: CollectionRow
  onRename: (id: string, nextName: string) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => setName(item.name), [item.name])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-amber-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Rename collection"
          />
        ) : (
          <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
        )}
        <span className="text-[11px] text-slate-500">{item.itemCount} itens</span>
      </div>

      <p className="text-[11px] text-slate-600">Updated {new Date(item.updatedAt).toLocaleDateString('en-US')}</p>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className="text-xs text-slate-300 hover:text-slate-100"
              onClick={() => { setEditing(false); void onRename(item.id, name) }}
            >
              Save
            </button>
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-200"
              onClick={() => { setEditing(false); setName(item.name) }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-200"
            onClick={() => setEditing(true)}
          >
            Rename
          </button>
        )}

        <div className="ml-auto">
          {confirm ? (
            <div className="flex items-center gap-2">
              <button type="button" className="text-xs text-red-300 hover:text-red-200" onClick={() => onRemove(item.id)}>Delete</button>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-200" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="text-xs text-slate-500 hover:text-red-300" onClick={() => setConfirm(true)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

