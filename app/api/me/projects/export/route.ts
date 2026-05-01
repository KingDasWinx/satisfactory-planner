import { NextResponse } from 'next/server'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:projects:export:${ip}`, { windowMs: 60_000, limit: 30 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const projects = await prisma.project.findMany({
    where: { ownerId: uid },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      flows: { orderBy: { createdAt: 'desc' }, take: 1, select: { data: true, createdAt: true } },
    },
    take: 200,
  })

  return NextResponse.json({
    exportedAt: Date.now(),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isPublic: p.visibility === 'COMMUNITY',
      createdAt: p.createdAt.getTime(),
      updatedAt: p.updatedAt.getTime(),
      latestSnapshot: p.flows[0]?.data ?? null,
    })),
  })
}

