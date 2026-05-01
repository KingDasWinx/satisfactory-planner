import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsername } from '@/lib/server/usernames'

interface Params {
  params: Promise<{ username: string }>
}

export async function GET(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsername(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:following:${username}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const following = await prisma.follow.findMany({
    where: {
      followerId: user.id,
      ...(q ? { following: { OR: [{ username: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      following: { select: { username: true, name: true, image: true } },
    },
    take: 200,
  })

  return NextResponse.json(following.map((f) => ({
    username: f.following.username,
    name: f.following.name,
    image: f.following.image,
  })))
}

