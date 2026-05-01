import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:likes:${id}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, visibility: true } })
  if (!project || project.visibility !== 'COMMUNITY') return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id ?? null

  const [count, me] = await Promise.all([
    prisma.projectLike.count({ where: { projectId: id } }),
    uid ? prisma.projectLike.findUnique({ where: { projectId_userId: { projectId: id, userId: uid } }, select: { id: true } }) : null,
  ])

  return NextResponse.json({ count, likedByMe: me !== null })
}

