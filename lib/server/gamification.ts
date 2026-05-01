import 'server-only'

import { prisma } from '@/lib/server/prisma'

export type GamificationAction =
  | 'like_given'
  | 'comment_created'
  | 'project_published'
  | 'fork_created'

const POINTS: Record<GamificationAction, number> = {
  like_given: 1,
  comment_created: 2,
  project_published: 5,
  fork_created: 3,
}

export function pointsFor(action: GamificationAction): number {
  return POINTS[action] ?? 0
}

export async function addPoints(userId: string, action: GamificationAction) {
  const inc = pointsFor(action)
  if (inc <= 0) return

  await prisma.userStats.upsert({
    where: { userId },
    update: { points: { increment: inc } },
    create: { userId, points: inc },
    select: { userId: true },
  })
}

export async function grantAchievement(userId: string, key: string) {
  const ach = await prisma.achievement.findUnique({ where: { key }, select: { id: true } })
  if (!ach) return

  await prisma.userAchievement.upsert({
    where: { userId_achievementId: { userId, achievementId: ach.id } },
    update: {},
    create: { userId, achievementId: ach.id },
    select: { id: true },
  })
}

