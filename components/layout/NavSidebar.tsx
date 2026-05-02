'use client'

import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'

export type NavSection = 'projects' | 'community' | 'settings'

interface NavSidebarProps {
  /** Seção ativa. Undefined = nenhuma ativa (ex: telas fora de /home). */
  activeSection?: NavSection
  /** Callback chamado ao clicar. Se omitido, navega para /home?section=X. */
  onSelect?: (s: NavSection) => void
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

const MAIN_ICON_MAP: Record<'projects' | 'community', (p: { className?: string }) => React.ReactElement> = {
  projects: IconFolder,
  community: IconGlobe,
}

export function NavSidebar({ activeSection, onSelect }: NavSidebarProps) {
  const router = useRouter()
  const t = useT()

  const MAIN_ITEMS: { id: NavSection; label: string; icon: (p: { className?: string }) => React.ReactElement }[] = [
    { id: 'projects', label: t.nav.projects, icon: IconFolder },
    { id: 'community', label: t.nav.community, icon: IconGlobe },
  ]

  function handleClick(s: NavSection) {
    if (onSelect) {
      onSelect(s)
    } else {
      router.push(`/home?section=${s}`)
    }
  }

  function NavBtn({ id }: { id: NavSection }) {
    const label = id === 'settings' ? t.nav.settings : (MAIN_ITEMS.find((i) => i.id === id)?.label ?? id)
    const Icon = id === 'settings' ? IconGear : (MAIN_ICON_MAP[id as 'projects' | 'community'] ?? IconFolder)
    const isActive = activeSection === id
    return (
      <button
        onClick={() => handleClick(id)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full
          ${isActive
            ? 'bg-amber-500/10 text-amber-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
      >
        <Icon />
        {label}
      </button>
    )
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-slate-900 border-r border-slate-800 h-full">
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1">
        {MAIN_ITEMS.map((item) => (
          <NavBtn key={item.id} id={item.id} />
        ))}
      </nav>

      <div className="px-2 pb-3 border-t border-slate-800 pt-2 space-y-0.5">
        <a
          href="https://forms.gle/YWQoCoK5JrJ1QJhC6"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4M12 16v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {t.nav.reportBug}
        </a>
        <NavBtn id="settings" />
      </div>
    </aside>
  )
}
