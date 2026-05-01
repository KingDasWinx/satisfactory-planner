import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

interface Params {
  params: Promise<{ collectionId: string }>
}

const AddSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
})

export async function POST(req: Request, { params }: Params) {
  const { collectionId } = await params

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:add-item:${collectionId}:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = AddSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const col = await prisma.collection.findFirst({ where: { id: collectionId, userId: uid }, select: { id: true } })
  if (!col) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  // só permite adicionar projetos existentes (qualquer id); UI deve restringir pra projetos do usuário.
  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } })
  if (!project) return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })

  await prisma.collectionItem.create({
    data: { collectionId, projectId: parsed.data.projectId },
    select: { id: true },
  }).catch(() => null) // idempotência via @@unique

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { collectionId } = await params

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:remove-item:${collectionId}:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const url = new URL(req.url)
  const projectId = (url.searchParams.get('projectId') ?? '').trim()
  if (!projectId) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const col = await prisma.collection.findFirst({ where: { id: collectionId, userId: uid }, select: { id: true } })
  if (!col) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.collectionItem.deleteMany({
    where: { collectionId, projectId },
  })

  return NextResponse.json({ ok: true })
}

