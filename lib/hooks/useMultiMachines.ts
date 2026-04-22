'use client'

import { useContext } from 'react'
import { MultiMachinesContext } from '@/lib/gameDataContext'
import type { MultiMachine } from '@/lib/types/game'

export function useMultiMachines(): MultiMachine[] {
  return useContext(MultiMachinesContext)
}
