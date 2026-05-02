import 'server-only'

/** Decode Next.js dynamic segment when `@` becomes literal `%40` in the path param. */
export function decodeUsernameFromRouteParam(raw: string): string {
  let s = raw.trim()
  while (s.startsWith('@') || s.toLowerCase().startsWith('%40')) {
    if (s.startsWith('@')) s = s.slice(1).trim()
    else s = s.slice(3).trim()
  }
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(s)
      if (next === s) break
      s = next.trim()
    } catch {
      break
    }
  }
  return s
}

export function normalizeUsername(raw: string): string | null {
  const u = raw.startsWith('@') ? raw.slice(1) : raw
  const trimmed = u.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) return null
  return trimmed
}

export function normalizeUsernameFromRouteParam(raw: string): string | null {
  return normalizeUsername(decodeUsernameFromRouteParam(raw))
}

