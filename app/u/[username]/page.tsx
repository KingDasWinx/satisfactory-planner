import { notFound } from 'next/navigation'
import { PublicProfileHeader } from '@/components/user/PublicProfileHeader'
import { UserProjectsGrid } from '@/components/user/UserProjectsGrid'
import { FollowersList } from '@/components/user/FollowersList'
import { FollowingList } from '@/components/user/FollowingList'
import { FeaturedProjects } from '@/components/user/FeaturedProjects'

interface Props {
  params: Promise<{ username: string }>
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null)
  if (!res || !res.ok) return null
  return (await res.json().catch(() => null)) as T | null
}

export default async function PublicUserProfilePage({ params }: Props) {
  const { username } = await params
  const cleaned = username.startsWith('@') ? username.slice(1) : username

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const profile = await fetchJson<{
    username: string
    name: string | null
    image: string | null
    bio: string
    level: number
    badges: string[]
    isPrivate?: boolean
    counts: { followers: number; following: number; publicProjects: number }
    isFollowing: boolean
  }>(`${base}/api/users/${encodeURIComponent(cleaned)}`)

  if (!profile) return notFound()

  return (
    <main className="min-h-screen bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <PublicProfileHeader
          username={profile.username}
          name={profile.name}
          image={profile.image}
          bio={profile.bio}
          level={profile.level}
          badges={profile.badges}
          counts={profile.counts}
          isFollowing={profile.isFollowing}
          isMe={false}
        />

        {profile.isPrivate ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-6 text-sm text-slate-500">
            Este perfil é privado.
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <a href="#destaques" className="text-xs rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-400 hover:text-slate-200">Destaques</a>
              <a href="#projetos" className="text-xs rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-400 hover:text-slate-200">Projetos</a>
              <a href="#seguidores" className="text-xs rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-400 hover:text-slate-200">Seguidores</a>
              <a href="#seguindo" className="text-xs rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-slate-400 hover:text-slate-200">Seguindo</a>
            </div>

            <div id="destaques" className="space-y-3">
              <h2 className="text-sm font-bold text-slate-100">Destaques</h2>
              <FeaturedProjects username={profile.username} />
            </div>

            <div id="projetos" className="space-y-3">
              <h2 className="text-sm font-bold text-slate-100">Projetos públicos</h2>
              <UserProjectsGrid username={profile.username} />
            </div>

            <div id="seguidores" className="space-y-3">
              <h2 className="text-sm font-bold text-slate-100">Seguidores</h2>
              <FollowersList username={profile.username} />
            </div>

            <div id="seguindo" className="space-y-3">
              <h2 className="text-sm font-bold text-slate-100">Seguindo</h2>
              <FollowingList username={profile.username} />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

