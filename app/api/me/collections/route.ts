import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
})

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:list:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const collections = await prisma.collection.findMany({
    where: { userId: uid },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true, _count: { select: { items: true } } },
    take: 200,
  })

  return NextResponse.json(collections.map((c) => ({
    id: c.id,
    name: c.name,
    updatedAt: c.updatedAt.getTime(),
    itemCount: c._count.items,
  })))
}

export async function POST(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:collections:create:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const created = await prisma.collection.create({
    data: { userId: uid, name: parsed.data.name },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: created.id })
}

