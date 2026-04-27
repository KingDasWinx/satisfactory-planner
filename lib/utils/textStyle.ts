export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Heurística simples (rápida e sem `CSS.supports`) para evitar salvar lixo no estado.
export function isLikelyCssColor(value: string): boolean {
  const v = value.trim()
  if (!v) return false

  if (v.startsWith('#')) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)
  }

  if (/^(rgb|rgba|hsl|hsla)\(/i.test(v)) return true

  // named colors (ex: "red", "rebeccapurple")
  if (/^[a-zA-Z]+$/.test(v)) return true

  return false
}

