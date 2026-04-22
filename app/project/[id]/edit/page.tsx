import { getGameData } from '@/lib/gameData'
import { FactoryEditor } from '@/components/FactoryEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPage({ params }: Props) {
  const { id } = await params
  const { machines, recipes, parts, multiMachines } = await getGameData()
  return (
    <main className="h-full w-full">
      <FactoryEditor
        machines={machines}
        recipes={recipes}
        parts={parts}
        multiMachines={multiMachines}
        projectId={id}
      />
    </main>
  )
}
