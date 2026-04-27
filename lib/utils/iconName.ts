export function partNameToIconPath(part: string): string | null {
  const name = part.trim()
  if (!name) return null
  const safe = name
    .replace(/\s+/g, '_')
    // Keep '.' because some in-game names use versions like "Mk.1"
    .replace(/[^A-Za-z0-9_.]/g, '')
  return safe ? `/icons/${safe}.png` : null
}

