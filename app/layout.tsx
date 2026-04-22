import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Satisfactory Factory Planner',
  description: 'Planejador visual de fábricas para Satisfactory',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  )
}
