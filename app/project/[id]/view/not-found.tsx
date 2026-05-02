import Link from 'next/link'

function IconLock() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ProjectNotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0f1117] px-4 text-center">
      <div className="mb-6 text-slate-600">
        <IconLock />
      </div>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        Projeto não disponível
      </h1>

      <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-8">
        Este projeto é privado ou não existe. Peça ao autor para torná-lo público na comunidade.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/home?section=community"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm px-5 py-2.5 transition-colors"
        >
          Ver comunidade
        </Link>

        <Link
          href="/home"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-sm px-5 py-2.5 transition-colors"
        >
          <IconArrowLeft />
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
