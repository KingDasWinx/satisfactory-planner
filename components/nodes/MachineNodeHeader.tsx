'use client'

import { useEffect, useRef, useState } from 'react'
import type { MachineNodeData } from '@/lib/types/store'
import { fmt } from '@/lib/utils/format'
import { partNameToIconPath } from '@/lib/utils/iconName'
import { ConfigPopup } from './ConfigPopup'

interface MachineNodeHeaderProps {
  id: string
  data: MachineNodeData
}

export function MachineNodeHeader({ id, data }: MachineNodeHeaderProps) {
  const { machine, nMachines, autoNMachines, clockSpeed } = data
  const displayMachineName = data.minerVariant ?? machine.name
  const displayMachines = autoNMachines ?? nMachines
  const [configAnchor, setConfigAnchor] = useState<DOMRect | null>(null)
  const configBtnRef = useRef<HTMLButtonElement>(null)
  const [hideMachineIcon, setHideMachineIcon] = useState(false)

  const machineIconSrc = partNameToIconPath(displayMachineName)

  useEffect(() => {
    setHideMachineIcon(false)
  }, [machineIconSrc])

  return (
    <div className="flex items-center gap-2 rounded-t-lg bg-amber-500/20 px-3 py-2 border-b border-amber-500/30">
      {machineIconSrc && !hideMachineIcon ? (
        <img
          src={machineIconSrc}
          alt={displayMachineName}
          className="h-7 w-7 shrink-0 object-contain"
          draggable={false}
          onError={() => setHideMachineIcon(true)}
        />
      ) : (
        <span className="w-9 h-9 shrink-0" />
      )}
      <span className="text-sm font-semibold text-amber-200 truncate">
        {displayMachines !== 1 && (
          <span className="text-amber-400 mr-1" title={autoNMachines !== undefined ? `Máquinas efetivas (por gargalo): ${displayMachines}×` : `Máquinas: ${displayMachines}×`}>
            {displayMachines}×
          </span>
        )}
        {displayMachineName}
      </span>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {machine.averagePower > 0 && (
          <span
            className="text-xs text-slate-400"
            title={`Potência estimada: ${fmt(machine.averagePower * displayMachines * Math.pow(clockSpeed, 1.322))} MW`}
          >
            {fmt(machine.averagePower * displayMachines * Math.pow(clockSpeed, 1.322))} MW
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
