import { notFound } from 'next/navigation'
import { getGameData } from '@/lib/gameData'
import { FactoryEditor } from '@/components/FactoryEditor'
import { ProjectSidebar } from '@/components/community/ProjectSidebar'
import { prisma } from '@/lib/server/prisma'
import { auth } from '@/lib/server/auth'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ViewPage({ params }: Props) {
  const { id } = await params

  const [gameData, project, session] = await Promise.all([
    getGameData(),
    prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        ownerId: true,
        owner: { select: { username: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    auth(),
  ])

  if (!project || project.visibility !== 'COMMUNITY') return notFound()

  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id ?? null
  const isOwner = !!viewerId && viewerId === project.ownerId

  const { machines, recipes, parts, multiMachines } = gameData

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex-1 min-w-0 h-full">
        <FactoryEditor
          machines={machines}
          recipes={recipes}
          parts={parts}
          multiMachines={multiMachines}
          projectId={id}
          readOnly
        />
      </div>
      <div className="w-[360px] shrink-0 h-full border-l border-slate-800 bg-slate-900">
        <ProjectSidebar
          projectId={id}
          projectName={project.name}
          projectDescription={project.description ?? ''}
          ownerUsername={project.owner?.username ?? 'usuario'}
          ownerName={project.owner?.name ?? null}
          ownerImage={project.owner?.image ?? null}
          commentCount={project._count.comments}
          isOwner={isOwner}
        />
      </div>
    </div>
  )
}
