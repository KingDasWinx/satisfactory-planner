import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

interface Params {
  params: Promise<{ collectionId: string }>
}

const RenameSchema = z.object({
  name: z.string().trim().min(1).max(60),
})

export async function PATCH(req: Request, { params }: Params) {
  const { collectionId } = await params

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:rename:${collectionId}:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = RenameSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const exists = await prisma.collection.findFirst({ where: { id: collectionId, userId: uid }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.collection.update({
    where: { id: collectionId },
    data: { name: parsed.data.name },
    select: { id: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { collectionId } = await params

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:delete:${collectionId}:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const exists = await prisma.collection.findFirst({ where: { id: collectionId, userId: uid }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.collection.delete({ where: { id: collectionId }, select: { id: true } })
  return NextResponse.json({ ok: true })
}

