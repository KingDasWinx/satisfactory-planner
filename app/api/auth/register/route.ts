import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

import { prisma } from '@/lib/server/prisma'
import { rateLimit } from '@/lib/server/rateLimit'
import { normalizeUsername } from '@/lib/server/usernames'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`auth:register:${ip}`, { windowMs: 60_000, limit: 20 })
  if (!rl.ok) return NextResponse.json({ error: 'Muitas requisições.' }, { status: 429 })

  const body = (await req.json().catch(() => null)) as null | { email?: unknown; password?: unknown; name?: unknown; username?: unknown }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const username = typeof body?.username === 'string' ? normalizeUsername(body.username) : null

  if (!email || !email.includes('@') || password.length < 8 || !username) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })

  const existingUsername = await prisma.user.findUnique({ where: { username }, select: { id: true } })
  if (existingUsername) return NextResponse.json({ error: 'Username já em uso.' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash, username, profile: { create: {} } },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: user.id })
}

