import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { ForkSchema, assertMaxJsonSize } from '@/lib/server/validators'
import { addPoints, grantAchievement } from '@/lib/server/gamification'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:fork:${id}:${ip}`, { windowMs: 60_000, limit: 60 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = ForkSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      flows: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { data: true },
      },
    },
  })

  if (!project || project.visibility !== 'COMMUNITY') {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  }

  const snapshot = project.flows[0]?.data ?? null
  try {
    assertMaxJsonSize(snapshot, 2_000_000)
  } catch {
    return NextResponse.json({ error: 'Snapshot muito grande.' }, { status: 413 })
  }

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id

  if (!uid || parsed.data.target === 'local') {
    return NextResponse.json({
      mode: 'local',
      meta: {
        name: `${project.name} (cópia)`,
        description: project.description,
        isPublic: false,
      },
      data: snapshot,
    })
  }

  const created = await prisma.project.create({
    data: {
      ownerId: uid,
      name: `${project.name} (fork)`,
      description: project.description,
      visibility: 'PRIVATE',
      flows: { create: { data: snapshot as never } },
    },
    select: { id: true },
  })

  await prisma.projectFork.create({
    data: {
      userId: uid,
      sourceProjectId: project.id,
      forkProjectId: created.id,
    },
    select: { id: true },
  })

  await addPoints(uid, 'fork_created')
  await grantAchievement(uid, 'first_fork')

  return NextResponse.json({ mode: 'cloud', id: created.id })
}

