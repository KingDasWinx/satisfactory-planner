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
  const rl = rateLimit(`users:featured:${username}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, profile: { select: { isPrivate: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (user.profile?.isPrivate === true) return NextResponse.json([], { status: 200 })

  const featured = await prisma.featuredProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      project: { select: { id: true, name: true, description: true, updatedAt: true, visibility: true } },
    },
    take: 12,
  })

  return NextResponse.json(featured
    .filter((f) => f.project.visibility === 'COMMUNITY')
    .map((f) => ({
      createdAt: f.createdAt.getTime(),
      id: f.project.id,
      name: f.project.name,
      description: f.project.description,
      updatedAt: f.project.updatedAt.getTime(),
    })))
}

