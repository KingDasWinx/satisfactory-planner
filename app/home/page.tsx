import { getGameData } from '@/lib/gameData'
import { HomeClient } from '@/components/home/HomeClient'

export default async function HomePage() {
  const { multiMachines } = await getGameData()
  return <HomeClient multiMachines={multiMachines} />
}
