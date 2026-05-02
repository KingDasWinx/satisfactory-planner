import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsernameFromRouteParam } from '@/lib/server/usernames'

interface Params {
  params: Promise<{ username: string }>
}

export async function GET(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:projects:${username}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, profile: { select: { isPrivate: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (user.profile?.isPrivate === true) return NextResponse.json([], { status: 200 })

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, visibility: 'COMMUNITY' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, updatedAt: true },
    take: 200,
  })

  return NextResponse.json(projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    updatedAt: p.updatedAt.getTime(),
  })))
}

