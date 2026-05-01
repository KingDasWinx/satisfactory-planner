import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definido.')
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma

