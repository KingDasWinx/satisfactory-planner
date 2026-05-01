import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const LinksSchema = z.object({
  github: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  discord: z.string().url().optional().or(z.literal('')),
  site: z.string().url().optional().or(z.literal('')),
}).partial()

const UpdateProfileSchema = z.object({
  bio: z.string().trim().max(160).default(''),
  isPrivate: z.boolean().default(false),
  links: LinksSchema.default({}),
  badges: z.array(z.string().trim().min(1).max(24)).max(10).default([]),
})

export async function PUT(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:profile:update:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = UpdateProfileSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const { bio, isPrivate, links, badges } = parsed.data

  await prisma.userProfile.upsert({
    where: { userId: uid },
    update: { bio, isPrivate, links: links as never, badges },
    create: { userId: uid, bio, isPrivate, links: links as never, badges },
    select: { userId: true },
  })

  return NextResponse.json({ ok: true })
}

