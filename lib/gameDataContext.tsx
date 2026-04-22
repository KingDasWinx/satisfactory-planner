'use client'

import { createContext } from 'react'
import type { MultiMachine } from '@/lib/types/game'

export const MultiMachinesContext = createContext<MultiMachine[]>([])

export function MultiMachinesProvider({ value, children }: { value: MultiMachine[]; children: React.ReactNode }) {
  return <MultiMachinesContext.Provider value={value}>{children}</MultiMachinesContext.Provider>
}
