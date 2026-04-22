export function fmt(n: number): string {
  if (n === 0) return '0'
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  if (Number.isInteger(n) || n >= 100) return n.toFixed(0)
  if (n >= 10) return n.toFixed(1)
  return n.toFixed(2)
}
