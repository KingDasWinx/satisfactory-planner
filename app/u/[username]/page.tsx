import { notFound } from 'next/navigation'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { normalizeUsername } from '@/lib/server/usernames'
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

export default async function PublicUserProfilePage({ params, searchParams }: Props) {
  const { username } = await params
  const { tab } = await searchParams
  const cleaned = username.startsWith('@') ? username.slice(1) : username

  const session = await auth()
  const viewerId = (session?.user as unknown as { id?: string } | undefined)?.id ?? null
  const viewerUsername = (session?.user as unknown as { username?: string } | undefined)?.username ?? null

  const usernameNorm = normalizeUsername(cleaned)
  if (!usernameNorm) return notFound()

  const isMe = viewerUsername?.toLowerCase() === usernameNorm

  const user = await prisma.user.findUnique({
    where: { username: usernameNorm },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      profile: { select: { bio: true, isPrivate: true, links: true, badges: true } },
      stats: { select: { level: true } },
      _count: { select: { followers: true, following: true } },
    },
  })

  if (!user) return notFound()

  const isPrivate = user.profile?.isPrivate === true

  const publicProjects = await prisma.project.count({
    where: { ownerId: user.id, visibility: 'COMMUNITY' },
  })

  const isFollowing = viewerId
    ? (await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        select: { id: true },
      })) !== null
    : false

  const activeTab = tab ?? 'destaques'

  const profileBio = user.profile?.bio ?? ''
  const profileIsPrivate = user.profile?.isPrivate ?? false
  const profileLinks = (user.profile?.links ?? {}) as Record<string, string>
  const profileBadges = (user.profile?.badges ?? []) as string[]
  const profileLevel = user.stats?.level ?? 1

  return (
    <main className="min-h-screen bg-[#0f1117]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <PublicProfileHeader
          username={user.username!}
          name={user.name}
          image={user.image}
          bio={profileBio}
          level={profileLevel}
          badges={profileBadges}
          counts={{ followers: user._count.followers, following: user._count.following, publicProjects }}
          isFollowing={isFollowing}
          isMe={isMe}
          activeTab={activeTab}
        />

        {isPrivate && !isMe ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 text-center space-y-2">
            <p className="text-slate-400 font-medium">Este perfil é privado</p>
            <p className="text-sm text-slate-600">Apenas seguidores aprovados podem ver o conteúdo.</p>
          </div>
        ) : (
          <div>
            {isMe && activeTab === 'editar' && (
              <div className="bg-slate-900 border-x border-b border-slate-800 rounded-b-2xl px-6 py-6">
                <EditProfilePanel
                  initialBio={profileBio}
                  initialIsPrivate={profileIsPrivate}
                  initialLinks={profileLinks}
                />
              </div>
            )}

            {activeTab !== 'editar' && (
              <div className="mt-6 space-y-6">
                {activeTab === 'destaques' && <FeaturedProjects username={user.username!} />}
                {activeTab === 'projetos' && <UserProjectsGrid username={user.username!} />}
                {activeTab === 'seguidores' && <FollowersList username={user.username!} />}
                {activeTab === 'seguindo' && <FollowingList username={user.username!} />}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
