import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

const BodySchema = z.object({
  projectId: z.string().trim().min(1).max(64),
})

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:featured:list:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const featured = await prisma.featuredProject.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      project: { select: { id: true, name: true, description: true, updatedAt: true, visibility: true } },
    },
    take: 50,
  })

  return NextResponse.json(featured
    .filter((f) => f.project.visibility === 'COMMUNITY')
    .map((f) => ({
      createdAt: f.createdAt.getTime(),
      project: {
        id: f.project.id,
        name: f.project.name,
        description: f.project.description,
        updatedAt: f.project.updatedAt.getTime(),
      },
    })))
}

export async function POST(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:featured:add:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  // Só pode destacar projeto do próprio usuário e que esteja publicado.
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, ownerId: uid, visibility: 'COMMUNITY' },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })

  await prisma.featuredProject.create({
    data: { userId: uid, projectId: project.id },
    select: { id: true },
  }).catch(() => null) // idempotência via @@unique

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:featured:remove:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const url = new URL(req.url)
  const projectId = (url.searchParams.get('projectId') ?? '').trim()
  if (!projectId) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  await prisma.featuredProject.deleteMany({ where: { userId: uid, projectId } })
  return NextResponse.json({ ok: true })
}

