'use client'

import Link from 'next/link'
import { MeStatsCard } from '@/components/me/MeStatsCard'
import { CollectionsPanel } from '@/components/me/CollectionsPanel'

export type CloudProject = {
  id: string
  name: string
  description: string | null
  visibility: string
  updatedAt: string
}

interface MyAccountTabProps {
  projects: CloudProject[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US')
}

export function MyAccountTab({ projects }: MyAccountTabProps) {
  const publicCount = projects.filter((p) => p.visibility === 'COMMUNITY').length

  return (
    <div className="mt-6 space-y-6">
      {/* Stats de gamificação */}
      <MeStatsCard />

      {/* Projetos na nuvem */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100">My cloud projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              {publicCount > 0 && ` · ${publicCount} public`}
            </p>
          </div>
          <Link
            href="/home?section=projects"
            className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors"
          >
            Open planner
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-slate-600">No cloud projects yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}/edit`}
                className="group rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900 transition-colors p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-amber-400 transition-colors">
                    {p.name}
                  </p>
                  <span className={`shrink-0 text-[11px] rounded-full px-2 py-0.5 border ${
                    p.visibility === 'COMMUNITY'
                      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                      : 'text-slate-400 border-slate-700 bg-slate-800'
                  }`}>
                    {p.visibility === 'COMMUNITY' ? 'Published' : 'Private'}
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{p.description}</p>
                )}
                <p className="text-[11px] text-slate-600 mt-3">Updated {fmt(p.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Coleções */}
      <CollectionsPanel />
    </div>
  )
}
