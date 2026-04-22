'use client'

import { createContext, useContext } from 'react'
import type { MultiMachine } from '@/lib/gameData'

const MultiMachinesContext = createContext<MultiMachine[]>([])

export function MultiMachinesProvider({ value, children }: { value: MultiMachine[]; children: React.ReactNode }) {
  return <MultiMachinesContext.Provider value={value}>{children}</MultiMachinesContext.Provider>
}

export function useMultiMachines() {
  return useContext(MultiMachinesContext)
}
