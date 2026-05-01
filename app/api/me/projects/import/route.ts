import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { assertMaxJsonSize } from '@/lib/server/validators'

const ImportSchema = z.object({
  meta: z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(''),
    isPublic: z.boolean().default(false),
  }),
  data: z.unknown(),
})

export async function POST(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:projects:import:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = ImportSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  try {
    assertMaxJsonSize(parsed.data.data, 2_000_000)
  } catch {
    return NextResponse.json({ error: 'Snapshot muito grande.' }, { status: 413 })
  }

  const { name, description, isPublic } = parsed.data.meta
  const visibility = isPublic ? 'COMMUNITY' : 'PRIVATE'

  const created = await prisma.project.create({
    data: {
      ownerId: uid,
      name,
      description,
      visibility,
      flows: { create: { data: parsed.data.data as never } },
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: created.id })
}

