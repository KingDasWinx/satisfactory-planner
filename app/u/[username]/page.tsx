import { notFound } from 'next/navigation'
import { auth } from '@/lib/server/auth'
import { PublicProfileHeader } from '@/components/user/PublicProfileHeader'
import { UserProjectsGrid } from '@/components/user/UserProjectsGrid'
import { FollowersList } from '@/components/user/FollowersList'
import { FollowingList } from '@/components/user/FollowingList'
import { FeaturedProjects } from '@/components/user/FeaturedProjects'
import { EditProfilePanel } from '@/components/user/EditProfilePanel'

interface Props {
  params: Promise<{ username: string }>
  searchParams: Promise<{ tab?: string }>
}

interface ProfileData {
  username: string
  name: string | null
  image: string | null
  bio: string
  level: number
  badges: string[]
  links?: Record<string, string>
  isPrivate?: boolean
  counts: { followers: number; following: number; publicProjects: number }
  isFollowing: boolean
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null)
  if (!res || !res.ok) return null
  return (await res.json().catch(() => null)) as T | null
}

export default async function PublicUserProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab } = await searchParams
  const cleaned = username.startsWith('@') ? username.slice(1) : username

  const session = await auth()
  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id ?? null
  const viewerUsername = (session?.user as unknown as { username?: string } | undefined)?.username ?? null

  const isMe = viewerUsername?.toLowerCase() === cleaned.toLowerCase()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const profile = await fetchJson<ProfileData>(`${base}/api/users/${encodeURIComponent(cleaned)}`)

  if (!profile) return notFound()

  const activeTab = tab ?? 'destaques'

  return (
    <main className="min-h-screen bg-[#0f1117]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-0">

        <PublicProfileHeader
          username={profile.username}
          name={profile.name}
          image={profile.image}
          bio={profile.bio}
          level={profile.level}
          badges={profile.badges}
          counts={profile.counts}
          isFollowing={profile.isFollowing}
          isMe={isMe}
          activeTab={activeTab}
        />

        {profile.isPrivate && !isMe ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 text-center space-y-2">
            <p className="text-slate-400 font-medium">Este perfil é privado</p>
            <p className="text-sm text-slate-600">Apenas seguidores aprovados podem ver o conteúdo.</p>
          </div>
        ) : (
          <div className="mt-0">
            {/* Edit panel — only for owner, tab=editar */}
            {isMe && activeTab === 'editar' && (
              <div className="bg-slate-900 border-x border-b border-slate-800 rounded-b-2xl px-6 py-6">
                <EditProfilePanel
                  initialBio={profile.bio}
                  initialIsPrivate={profile.isPrivate ?? false}
                  initialLinks={profile.links ?? {}}
                />
              </div>
            )}

            {/* Content tabs */}
            {activeTab !== 'editar' && (
              <div className="mt-6 space-y-6">
                {activeTab === 'destaques' && (
                  <section>
                    <FeaturedProjects username={profile.username} />
                  </section>
                )}

                {activeTab === 'projetos' && (
                  <section>
                    <UserProjectsGrid username={profile.username} />
                  </section>
                )}

                {activeTab === 'seguidores' && (
                  <section>
                    <FollowersList username={profile.username} />
                  </section>
                )}

                {activeTab === 'seguindo' && (
                  <section>
                    <FollowingList username={profile.username} />
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
