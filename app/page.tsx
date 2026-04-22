import { getGameData } from '@/lib/gameData'
import { FactoryEditor } from '@/components/FactoryEditor'

export default async function Page() {
  const { machines, recipes, parts, multiMachines } = await getGameData()
  return (
    <main className="flex h-screen w-screen">
      <FactoryEditor machines={machines} recipes={recipes} parts={parts} multiMachines={multiMachines} />
    </main>
  )
}
