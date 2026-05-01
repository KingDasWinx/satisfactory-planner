import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

interface Params {
  params: Promise<{ id: string; commentId: string }>
}

export async function DELETE(req: Request, { params }: Params) {
  const { id, commentId } = await params
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:comments:delete:${id}:${commentId}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const comment = await prisma.projectComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, projectId: true },
  })
  if (!comment || comment.projectId !== id) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (comment.userId !== uid) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  await prisma.projectComment.delete({ where: { id: commentId }, select: { id: true } })
  return NextResponse.json({ ok: true })
}

