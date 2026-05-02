import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsernameFromRouteParam } from '@/lib/server/usernames'

interface Params {
  params: Promise<{ username: string }>
}

export async function GET(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:profile:${username}:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const session = await auth()
  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id ?? null

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      profile: { select: { bio: true, isPrivate: true, links: true, badges: true } },
      stats: { select: { level: true } },
      _count: {
        select: {
          followers: true,
          following: true,
          projects: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  const isPrivate = user.profile?.isPrivate === true
  const isMe = viewerId === user.id

  if (isPrivate && !isMe) {
    return NextResponse.json({
      username: user.username,
      name: user.name,
      image: user.image,
      bio: '',
      level: 1,
      badges: [],
      counts: { followers: 0, following: 0, publicProjects: 0 },
      isFollowing: false,
      isPrivate: true,
    })
  }

  const publicProjects = await prisma.project.count({ where: { ownerId: user.id, visibility: 'COMMUNITY' } })

  const isFollowing = viewerId
    ? (await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      select: { id: true },
    })) !== null
    : false

  return NextResponse.json({
    username: user.username,
    name: user.name,
    image: user.image,
    bio: user.profile?.bio ?? '',
    level: user.stats?.level ?? 1,
    links: user.profile?.links ?? {},
    badges: user.profile?.badges ?? [],
    isPrivate,
    counts: {
      followers: user._count.followers,
      following: user._count.following,
      publicProjects,
    },
    isFollowing,
  })
}

