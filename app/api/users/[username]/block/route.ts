import { NextResponse } from 'next/server'

import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsernameFromRouteParam } from '@/lib/server/usernames'

interface Params {
  params: Promise<{ username: string }>
}

export async function POST(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:block:${username}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  if (target.id === uid) return NextResponse.json({ error: 'Você não pode bloquear a si mesmo.' }, { status: 400 })

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: uid, blockedId: target.id } },
    update: {},
    create: { blockerId: uid, blockedId: target.id },
    select: { id: true },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: Params) {
  const { username: raw } = await params
  const username = normalizeUsernameFromRouteParam(raw)
  if (!username) return NextResponse.json({ error: 'Usuário inválido.' }, { status: 400 })

  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`users:unblock:${username}:${ip}`, { windowMs: 60_000, limit: 120 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

  await prisma.userBlock.deleteMany({ where: { blockerId: uid, blockedId: target.id } })
  return NextResponse.json({ ok: true })
}

