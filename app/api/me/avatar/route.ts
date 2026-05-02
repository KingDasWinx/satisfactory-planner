import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const MAX_BASE64_BYTES = 600_000 // ~450 KB decoded

export async function PATCH(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:avatar:${uid}:${ip}`, { windowMs: 60_000, limit: 10 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const image = typeof body?.image === 'string' ? body.image : null

  if (!image) return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 })
  if (!image.startsWith('data:image/')) return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 })
  if (image.length > MAX_BASE64_BYTES) return NextResponse.json({ error: 'Imagem muito grande (máx. 450 KB).' }, { status: 413 })

  await prisma.user.update({
    where: { id: uid },
    data: { image },
  })

  return NextResponse.json({ ok: true })
}
