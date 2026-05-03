'use client'

import { useEffect, useState } from 'react'
import { LevelProgressBar } from '@/components/home/LevelProgressBar'
import { AchievementBadgeList } from '@/components/home/AchievementBadgeList'

interface Achievement {
  key: string
  title: string
  description: string
  createdAt?: number
}

interface StatsData {
  level: number
  points: number
  achievements: Achievement[]
}

export function MeStatsCard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/me/stats')
      .then((r) =>
        r.ok
          ? (r.json() as Promise<StatsData>)
          : Promise.reject(new Error('bad'))
      )
      .then((json) => {
        if (!cancelled)
          setStats({
            level: Number(json.level ?? 1),
            points: Number(json.points ?? 0),
            achievements: Array.isArray(json.achievements)
              ? json.achievements
              : [],
          })
      })
      .catch(() => {
        if (!cancelled)
          setError('Could not load your stats.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5">
        <p className="text-xs text-slate-600">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5">
        <p className="text-xs text-red-300">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Your account
          </p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            Level {stats.level}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{stats.points}</p>
            <p className="text-xs text-slate-500">Points</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">
              {stats.achievements.length}
            </p>
            <p className="text-xs text-slate-500">Achievements</p>
          </div>
        </div>
      </div>

      <LevelProgressBar level={stats.level} points={stats.points} />

      {stats.achievements && stats.achievements.length > 0 && (
        <>
          <div className="pt-2 border-t border-slate-800" />
          <AchievementBadgeList achievements={stats.achievements.slice(0, 4)} />
        </>
      )}
    </div>
  )
}
