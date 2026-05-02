'use client'

import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { useUiStore } from '@/store/uiStore'
import { useSession } from 'next-auth/react'
import { useT, LOCALE_LABELS, type Locale } from '@/lib/i18n'

function IconPalette() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconKeyboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10h1M10 10h1M14 10h1M18 10h1M6 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconDatabase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5M12 8v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      {children}
    </div>
  )
}

function AppearanceSection() {
  const t = useT()
  const s = t.settings.appearance
  return (
    <Card>
      <SectionHeader icon={<IconPalette />} title={s.title} description={s.description} />
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl border-2 border-amber-500 bg-slate-950 p-3 text-left transition-all"
          disabled
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[#0f1117] border border-slate-700" />
            <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
          </div>
          <p className="text-xs font-semibold text-slate-100">{s.dark}</p>
          <p className="text-[11px] text-amber-400 mt-0.5">{s.active}</p>
        </button>

        <button
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-left opacity-40 cursor-not-allowed"
          disabled
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
            <div className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
          </div>
          <p className="text-xs font-semibold text-slate-400">{s.light}</p>
          <p className="text-[11px] text-slate-600 mt-0.5">{s.comingSoon}</p>
        </button>
      </div>
    </Card>
  )
}

function ShortcutsSection() {
  const t = useT()
  const s = t.settings.shortcuts
  const [open, setOpen] = useState(false)

  const shortcuts = [
    { keys: ['Double click'], action: s.actions.addRecipe },
    { keys: ['Ctrl', 'Z'], action: s.actions.undo },
    { keys: ['Ctrl', 'Y'], action: s.actions.redo },
    { keys: ['Ctrl', 'C'], action: s.actions.copy },
    { keys: ['Ctrl', 'V'], action: s.actions.paste },
    { keys: ['Delete'], action: s.actions.delete },
    { keys: ['Esc'], action: s.actions.escape },
    { keys: ['T'], action: s.actions.text },
    { keys: ['F'], action: s.actions.frame },
  ]

  return (
    <Card>
      <SectionHeader icon={<IconKeyboard />} title={s.title} description={s.description} />
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span>{open ? s.hide : s.show}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-800 overflow-hidden">
          {shortcuts.map((shortcut, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-2.5 text-xs ${
                i < shortcuts.length - 1 ? 'border-b border-slate-800' : ''
              }`}
            >
              <span className="text-slate-400">{shortcut.action}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-slate-300"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function DataSection() {
  const t = useT()
  const s = t.settings.data
  const { data: session } = useSession()
  const exportCloudProjects = useProjectStore((s) => s.exportCloudProjects)
  const [exporting, setExporting] = useState(false)

  async function handleExportCloud() {
    if (exporting) return
    setExporting(true)
    const json = await exportCloudProjects().catch(() => null)
    setExporting(false)
    if (!json) return
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `satisfactory-planner-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <SectionHeader icon={<IconDatabase />} title={s.title} description={s.description} />
      <div className="space-y-2">
        {session?.user ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-slate-200">{s.cloudProjects}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.cloudProjectsDescription}</p>
            </div>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExportCloud()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors shrink-0"
            >
              <IconDownload />
              {exporting ? s.exporting : s.export}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-xs text-slate-500">{s.loginToExport}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

function LanguageSection() {
  const t = useT()
  const s = t.settings.language
  const locale = useUiStore((st) => st.locale)
  const setLocale = useUiStore((st) => st.setLocale)

  return (
    <Card>
      <SectionHeader icon={<IconGlobe />} title={s.title} description={s.description} />
      <div className="flex gap-3">
        {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLocale(key)}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
              locale === key
                ? 'border-amber-500 bg-slate-950'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <p className={`text-xs font-semibold ${locale === key ? 'text-slate-100' : 'text-slate-400'}`}>
              {label}
            </p>
            {locale === key && (
              <p className="text-[11px] text-amber-400 mt-0.5">{t.settings.appearance.active}</p>
            )}
          </button>
        ))}
      </div>
    </Card>
  )
}

function AboutSection() {
  const t = useT()
  const s = t.settings.about
  return (
    <Card>
      <SectionHeader icon={<IconInfo />} title={s.title} description={s.description} />
      <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{s.version}</span>
          <span className="text-slate-300 font-mono">0.1.0-dev</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{s.game}</span>
          <span className="text-slate-300">Satisfactory 1.0</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{s.license}</span>
          <span className="text-slate-300">GPL-3.0</span>
        </div>
      </div>
    </Card>
  )
}

export function SettingsSection() {
  const t = useT()
  const s = t.settings
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-6 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-100">{s.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{s.subtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-6 space-y-5">
          <AppearanceSection />
          <LanguageSection />
          <ShortcutsSection />
          <DataSection />
          <AboutSection />
        </div>
      </div>
    </div>
  )
}
