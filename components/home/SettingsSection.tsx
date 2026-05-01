'use client'

import { useSession, signOut } from 'next-auth/react'
import { useProjectStore } from '@/store/projectStore'
import { useState } from 'react'
import { EditProfileForm } from '@/components/user/EditProfileForm'

export function SettingsSection() {
  const { data: session } = useSession()
  const [exporting, setExporting] = useState(false)
  const exportCloudProjects = useProjectStore((s) => s.exportCloudProjects)

  async function handleExportCloud() {
    if (exporting) return
    setExporting(true)
    const json = await exportCloudProjects().catch(() => null)
    setExporting(false)
    if (!json) return
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satisfactory-planner-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-6 border-b border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-slate-100">Configurações</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Conta */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Conta
          </h2>
          {session?.user ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 space-y-1.5 text-sm">
              <p className="font-semibold text-slate-100">
                {session.user.name ?? 'Conta'}
              </p>
              {session.user.email && (
                <p className="text-xs text-slate-500">{session.user.email}</p>
              )}
            </div>
          ) : null}
        </section>

        {/* Perfil */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Perfil
          </h2>
          {session?.user ? (
            <EditProfileForm />
          ) : (
            <p className="text-sm text-slate-600">
              Faça login para editar seu perfil.
            </p>
          )}
        </section>

        {/* Tema */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Tema
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">
              Tema escuro — padrão fixo (customizável em breve)
            </p>
          </div>
        </section>

        {/* Dados */}
        {session?.user && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Dados
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors disabled:opacity-60"
                disabled={exporting}
                onClick={() => {
                  void handleExportCloud()
                }}
              >
                {exporting ? 'Exportando...' : 'Exportar (cloud)'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
                onClick={() => {
                  void signOut({ redirect: false })
                }}
              >
                Sair
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
