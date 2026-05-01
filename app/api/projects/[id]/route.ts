import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { SaveSnapshotSchema, assertMaxJsonSize } from '@/lib/server/validators'
import { addPoints, grantAchievement } from '@/lib/server/gamification'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      flows: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { data: true },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  if (project.visibility !== 'COMMUNITY') {
    const session = await auth()
    const uid = (session?.user as unknown as { id?: string } | undefined)?.id
    if (!uid || uid !== project.ownerId) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  }

  const flow = project.flows[0]?.data ?? null

  return NextResponse.json({
    meta: {
      id: project.id,
      name: project.name,
      description: project.description,
      isPublic: project.visibility === 'COMMUNITY',
      createdAt: project.createdAt.getTime(),
      updatedAt: project.updatedAt.getTime(),
    },
    data: flow,
  })
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const uid = (session.user as unknown as { id?: string }).id
  if (!uid) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:save:${id}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = SaveSnapshotSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, ownerId: true, visibility: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  }

  if (project.ownerId !== uid) return NextResponse.json({ error: 'Proibido.' }, { status: 403 })

  const snapshot = parsed.data.data
  try {
    assertMaxJsonSize(snapshot, 2_000_000)
  } catch (e) {
    if (e instanceof Error && e.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Snapshot muito grande.' }, { status: 413 })
    }
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
  }

  // Tenta extrair campos de meta de forma defensiva
  const meta = (snapshot as { meta?: unknown }).meta
  const name = typeof (meta as { name?: unknown })?.name === 'string' ? (meta as { name: string }).name.trim() : null
  const description = typeof (meta as { description?: unknown })?.description === 'string' ? (meta as { description: string }).description.trim() : ''
  const isPublic = typeof (meta as { isPublic?: unknown })?.isPublic === 'boolean' ? (meta as { isPublic: boolean }).isPublic : null
  const publishNow = isPublic === true && project.visibility !== 'COMMUNITY'

  await prisma.$transaction(async (tx) => {
    await tx.projectFlow.create({
      data: {
        projectId: id,
        data: snapshot as never,
      },
    })

    await tx.project.update({
      where: { id },
      data: {
        ...(name !== null ? { name } : {}),
        description,
        ...(isPublic !== null ? { visibility: isPublic ? 'COMMUNITY' : 'PRIVATE' } : {}),
      },
    })
  })

  if (publishNow) {
    await addPoints(uid, 'project_published')
    await grantAchievement(uid, 'first_project_published')
  }

  return NextResponse.json({ ok: true })
}

