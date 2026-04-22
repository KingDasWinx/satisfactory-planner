'use client'

import { useRef, useState } from 'react'
import type { MachineNodeData } from '@/lib/types/store'
import { fmt } from '@/lib/utils/format'
import { ConfigPopup } from './ConfigPopup'

interface MachineNodeHeaderProps {
  id: string
  data: MachineNodeData
}

export function MachineNodeHeader({ id, data }: MachineNodeHeaderProps) {
  const { machine, nMachines, clockSpeed } = data
  const [configAnchor, setConfigAnchor] = useState<DOMRect | null>(null)
  const configBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex items-center gap-2 rounded-t-lg bg-amber-500/20 px-3 py-2 border-b border-amber-500/30">
      <span className="text-amber-400 text-base">⚙</span>
      <span className="text-sm font-semibold text-amber-200 truncate">
        {nMachines > 1 && <span className="text-amber-400 mr-1">{nMachines}×</span>}{machine.name}
      </span>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {machine.averagePower > 0 && (
          <span className="text-xs text-slate-400">
            {fmt(machine.averagePower * nMachines * Math.pow(clockSpeed, 1.322))} MW
          </span>
        )}
        <button
          ref={configBtnRef}
          onClick={(e) => {
            e.stopPropagation()
            setConfigAnchor(configAnchor ? null : configBtnRef.current?.getBoundingClientRect() ?? null)
          }}
          className="text-slate-400 hover:text-amber-400 text-xs leading-none px-1"
          title="Configurações"
        >
          ⚙
        </button>
      </div>

      {configAnchor && (
        <ConfigPopup id={id} data={data} anchorRect={configAnchor} onClose={() => setConfigAnchor(null)} />
      )}
    </div>
  )
}
