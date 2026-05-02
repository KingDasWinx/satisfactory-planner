import { AppShell } from '@/components/layout/AppShell'
import { NavSidebar } from '@/components/layout/NavSidebar'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppShell />
      <div className="flex flex-1 overflow-hidden">
        <NavSidebar />
        <main className="flex-1 overflow-y-auto bg-[#0f1117]">
          {children}
        </main>
      </div>
    </div>
  )
}
