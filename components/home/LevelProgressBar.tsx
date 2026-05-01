interface LevelProgressBarProps {
  level: number
  points: number
}

export function LevelProgressBar({ level, points }: LevelProgressBarProps) {
  const pointsPerLevel = 100
  const pointsToNext = pointsPerLevel - (points % pointsPerLevel)
  const progress = ((points % pointsPerLevel) / pointsPerLevel) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-amber-400 font-semibold">Nível {level}</span>
        <span className="text-slate-500">
          {points} pts · {pointsToNext} para o próximo
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
