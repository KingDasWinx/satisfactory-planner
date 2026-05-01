import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { addPoints, grantAchievement } from '@/lib/server/gamification'

interface Params {
  params: Promise<{ id: string }>
}

const CreateCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
})

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:comments:list:${id}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, visibility: true } })
  if (!project || project.visibility !== 'COMMUNITY') return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const comments = await prisma.projectComment.findMany({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { username: true, name: true, image: true } },
    },
    take: 200,
  })

  return NextResponse.json(comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.getTime(),
    user: c.user,
  })))
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:comments:create:${id}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = CreateCommentSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, visibility: true } })
  if (!project || project.visibility !== 'COMMUNITY') return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const created = await prisma.projectComment.create({
    data: { projectId: id, userId: uid, content: parsed.data.content },
    select: { id: true },
  })

  await addPoints(uid, 'comment_created')
  await grantAchievement(uid, 'first_comment')

  return NextResponse.json({ ok: true, id: created.id })
}

