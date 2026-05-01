import 'server-only'

export function normalizeUsername(raw: string): string | null {
  const u = raw.startsWith('@') ? raw.slice(1) : raw
  const trimmed = u.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) return null
  return trimmed
}

