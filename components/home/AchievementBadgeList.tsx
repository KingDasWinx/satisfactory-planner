interface Achievement {
  key: string
  title: string
  description: string
  createdAt?: number
}

interface AchievementBadgeListProps {
  achievements: Achievement[]
}

export function AchievementBadgeList({ achievements }: AchievementBadgeListProps) {
  if (!achievements || achievements.length === 0) {
    return (
      <p className="text-xs text-slate-600">
        Nenhuma conquista ainda — explore a comunidade!
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {achievements.slice(0, 6).map((a) => (
        <div
          key={a.key}
          className="group relative rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5"
        >
          <span className="text-xs font-semibold text-amber-300">{a.title}</span>

          {/* Tooltip */}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10">
            <div className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 whitespace-nowrap text-xs text-slate-200 pointer-events-none">
              {a.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
