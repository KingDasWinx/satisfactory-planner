import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  // eslint-disable-next-line no-var
  var __prismaServer: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    // Evita quebrar o build/import quando o DATABASE_URL não está disponível.
    // Qualquer uso real do Prisma sem URL deve falhar claramente.
    throw new Error('DATABASE_URL não definido.')
  }
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export function getPrisma(): PrismaClient {
  if (globalThis.__prismaServer) return globalThis.__prismaServer
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalThis.__prismaServer = client
  return client
}

// Compat: imports existentes
export const prisma = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return (getPrisma() as unknown as Record<PropertyKey, unknown>)[prop]
  },
})

