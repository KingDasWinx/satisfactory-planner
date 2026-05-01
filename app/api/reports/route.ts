import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const ReportSchema = z.object({
  targetType: z.enum(['project', 'comment', 'user']),
  targetId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(2).max(64),
  details: z.string().trim().max(500).optional().default(''),
})

export async function POST(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`reports:create:${ip}`, { windowMs: 60_000, limit: 30 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = ReportSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  await prisma.report.create({
    data: {
      reporterId: uid,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details,
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true })
}

