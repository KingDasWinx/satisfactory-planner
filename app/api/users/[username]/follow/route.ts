import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsernameFromRouteParam } from '@/lib/server/usernames'

interface Params {
  params: Promise<{ username: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const session = await auth()
  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!viewerId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:follow:${username}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (target.id === viewerId) return NextResponse.json({ error: 'Você não pode seguir a si mesmo.' }, { status: 400 })

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
    update: {},
    create: { followerId: viewerId, followingId: target.id },
    select: { id: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const session = await auth()
  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!viewerId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:unfollow:${username}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.follow.deleteMany({
    where: { followerId: viewerId, followingId: target.id },
  })

  return NextResponse.json({ ok: true })
}

