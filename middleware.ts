import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type Bucket = { resetAt: number; count: number }
const buckets = new Map<string, Bucket>()

function hit(key: string, { windowMs, limit }: { windowMs: number; limit: number }) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    const next: Bucket = { resetAt: now + windowMs, count: 1 }
    buckets.set(key, next)
    return { ok: true }
  }
  b.count += 1
  return { ok: b.count <= limit }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const routeKey = pathname.startsWith('/api/auth') ? 'auth' : pathname.startsWith('/api/projects') ? 'projects' : 'api'

  const { ok } = hit(`${routeKey}:${ip}`, { windowMs: 60_000, limit: routeKey === 'auth' ? 120 : 300 })
  if (!ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}

