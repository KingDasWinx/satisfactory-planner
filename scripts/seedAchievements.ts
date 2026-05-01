import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function getClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definido.')
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

async function main() {
  const prisma = getClient()
  await prisma.achievement.createMany({
    data: [
      { key: 'first_comment', title: 'Primeiro comentário', description: 'Você fez seu primeiro comentário.' },
      { key: 'first_like_given', title: 'Primeiro like', description: 'Você curtiu um projeto pela primeira vez.' },
      { key: 'first_project_published', title: 'Primeira publicação', description: 'Você publicou seu primeiro projeto.' },
      { key: 'first_fork', title: 'Primeiro fork', description: 'Você fez seu primeiro fork.' },
    ],
    skipDuplicates: true,
  })
  await prisma.$disconnect()
  // eslint-disable-next-line no-console
  console.log('OK: achievements seeded')
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exitCode = 1
})

