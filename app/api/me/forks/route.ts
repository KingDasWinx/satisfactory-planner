import { NextResponse } from 'next/server'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:forks:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const forks = await prisma.projectFork.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      sourceProject: { select: { id: true, name: true, owner: { select: { username: true } } } },
      forkProject: { select: { id: true, name: true } },
    },
    take: 200,
  })

  return NextResponse.json(forks.map((f) => ({
    createdAt: f.createdAt.getTime(),
    source: { id: f.sourceProject.id, name: f.sourceProject.name, ownerUsername: f.sourceProject.owner.username },
    fork: { id: f.forkProject.id, name: f.forkProject.name },
  })))
}

