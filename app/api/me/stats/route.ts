import { NextResponse } from 'next/server'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'

export async function GET(req: Request) {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`me:stats:${ip}`, { windowMs: 60_000, limit: 600 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const stats = await prisma.userStats.upsert({
    where: { userId: uid },
    update: {},
    create: { userId: uid },
    select: { level: true, points: true, updatedAt: true },
  })

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, achievement: { select: { key: true, title: true, description: true } } },
    take: 50,
  })

  return NextResponse.json({
    level: stats.level,
    points: stats.points,
    updatedAt: stats.updatedAt.getTime(),
    achievements: achievements.map((a) => ({
      createdAt: a.createdAt.getTime(),
      ...a.achievement,
    })),
  })
}

