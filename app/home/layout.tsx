import { AppShell } from '@/components/layout/AppShell'

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppShell />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
