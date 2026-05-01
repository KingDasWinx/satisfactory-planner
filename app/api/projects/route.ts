import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { CreateCloudProjectSchema } from '@/lib/server/validators'

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id ?? null

  const blockedIds = uid
    ? await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: uid }, { blockedId: uid }] },
      select: { blockerId: true, blockedId: true },
      take: 1000,
    })
    : []

  const hiddenOwnerIds = uid
    ? Array.from(new Set(blockedIds.flatMap((b) => [b.blockerId, b.blockedId]).filter((x) => x !== uid)))
    : []

  const projects = await prisma.project.findMany({
    where: {
      visibility: 'COMMUNITY',
      ...(hiddenOwnerIds.length ? { ownerId: { notIn: hiddenOwnerIds } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          username: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    take: 200,
  })

  return NextResponse.json(projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isPublic: p.visibility === 'COMMUNITY',
    createdAt: p.createdAt.getTime(),
    updatedAt: p.updatedAt.getTime(),
    ownerUsername: p.owner.username,
    ownerName: p.owner.name,
    ownerImage: p.owner.image,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
  })))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`projects:create:${ip}`, { windowMs: 60_000, limit: 30 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const parsed = CreateCloudProjectSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })

  const ownerId = (session.user as unknown as { id?: string }).id
  if (!ownerId) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

  const { name, description, visibility } = parsed.data

  const project = await prisma.project.create({
    data: {
      ownerId,
      name,
      description,
      visibility,
      flows: {
        create: {
          data: {
            meta: {
              id: 'temp',
              name,
              description,
              isPublic: visibility === 'COMMUNITY',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ id: project.id })
}

