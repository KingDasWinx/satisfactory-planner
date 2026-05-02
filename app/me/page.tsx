import { redirect } from 'next/navigation'
import { auth } from '@/lib/server/auth'

export default async function MePage() {
  const session = await auth()
  const username = (session?.user as unknown as { username?: string } | undefined)?.username
  if (username) redirect(`/u/@${username}?tab=conta`)
  redirect('/home')
}
