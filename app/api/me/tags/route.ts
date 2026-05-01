import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const UpdateTagsSchema = z.object({
  tags: z.array(z.string().trim().min(2).max(24)).max(20),
})

export async function PUT(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:tags:update:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = UpdateTagsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const names = Array.from(new Set(parsed.data.tags.map((t) => t.toLowerCase())))

  await prisma.$transaction(async (tx) => {
    await tx.userTag.deleteMany({ where: { userId: uid } })
    if (names.length) {
      await tx.userTag.createMany({
        data: names.map((name) => ({ userId: uid, name })),
        skipDuplicates: true,
      })
    }
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:tags:list:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const tags = await prisma.userTag.findMany({ where: { userId: uid }, orderBy: { createdAt: 'asc' }, select: { name: true } })
  return NextResponse.json(tags.map((t) => t.name))
}

