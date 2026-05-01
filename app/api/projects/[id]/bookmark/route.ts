import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:bookmark:${id}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const project = await prisma.project.findUnique({ where: { id }, select: { id: true, visibility: true } })
  if (!project || project.visibility !== 'COMMUNITY') return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.projectBookmark.upsert({
    where: { projectId_userId: { projectId: id, userId: uid } },
    update: {},
    create: { projectId: id, userId: uid },
    select: { id: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:unbookmark:${id}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  await prisma.projectBookmark.deleteMany({ where: { projectId: id, userId: uid } })
  return NextResponse.json({ ok: true })
}

