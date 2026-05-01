import { redirect } from 'next/navigation'
import { auth } from '@/lib/server/auth'
import { prisma } from '@/lib/server/prisma'
import { CollectionsPanel } from '@/components/me/CollectionsPanel'

function fmt(ts: Date) {
  return ts.toLocaleDateString('pt-BR')
}

export default async function MePage() {
  const session = await auth()
  const uid = (session?.user as unknown as { id?: string } | undefined)?.id
  if (!uid) redirect('/home')

  const projects = await prisma.project.findMany({
    where: { ownerId: uid },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, visibility: true, updatedAt: true },
    take: 200,
  })

  return (
    <main className="min-h-screen bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100">Minha conta</h1>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-100">Meus projetos na nuvem</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhum projeto na nuvem ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`/project/${p.id}/edit`}
                  className="rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/70 transition-colors p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
                    <span className={`text-[11px] rounded-full px-2 py-0.5 border ${
                      p.visibility === 'COMMUNITY'
                        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-slate-400 border-slate-700 bg-slate-800'
                    }`}>
                      {p.visibility === 'COMMUNITY' ? 'Publicado' : 'Privado'}
                    </span>
                  </div>
                  {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-3">{p.description}</p>}
                  <p className="text-xs text-slate-600 mt-3">Atualizado em {fmt(p.updatedAt)}</p>
                </a>
              ))}
            </div>
          )}
        </section>

        <CollectionsPanel />
      </div>
    </main>
  )
}

