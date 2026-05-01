import 'server-only'

type Bucket = { resetAt: number; count: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, { windowMs, limit }: { windowMs: number; limit: number }): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    const next: Bucket = { resetAt: now + windowMs, count: 1 }
    buckets.set(key, next)
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt }
  }

  existing.count += 1
  const remaining = Math.max(0, limit - existing.count)
  return { ok: existing.count <= limit, remaining, resetAt: existing.resetAt }
}

