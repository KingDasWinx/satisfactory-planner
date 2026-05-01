import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:bookmarks:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const bookmarks = await prisma.projectBookmark.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      project: {
        select: { id: true, name: true, description: true, updatedAt: true, owner: { select: { username: true } } },
      },
    },
    take: 200,
  })

  return NextResponse.json(bookmarks.map((b) => ({
    createdAt: b.createdAt.getTime(),
    project: {
      id: b.project.id,
      name: b.project.name,
      description: b.project.description,
      updatedAt: b.project.updatedAt.getTime(),
      ownerUsername: b.project.owner.username,
    },
  })))
}

