'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useMultiMachines } from '@/lib/hooks/useMultiMachines'
import { calcNodeRates } from '@/lib/flowCalc'
import { MachineNodeHeader } from './MachineNodeHeader'
import { MachineNodeBody } from './MachineNodeBody'
import type { MachineNodeData } from '@/lib/types/store'

// Pixel offsets matching MachineNodeHeader + MachineNodeBody layout.
// HEADER_H  = px-3 py-2 with text-sm (lh 20px): 8 + 20 + 8 = 36px
// BODY_PT   = py-2 top padding = 8px
// RECIPE_ROW= text-xs (lh 16px) + badge py-0.5 makes it ~20px + space-y-1.5 (6px) = 26px
// ITEM_H    = two text-xs lines: 16 + 16 = 32px (gap-0 between lines)
// ITEM_GAP  = space-y-0.5 = 2px between items
const HEADER_H = 36
const BODY_PT = 8
const RECIPE_ROW = 26
const ITEM_H = 32
const ITEM_GAP = 2

function itemHandleTop(i: number): number {
  return HEADER_H + BODY_PT + RECIPE_ROW + i * (ITEM_H + ITEM_GAP) + ITEM_H / 2
}

function MachineNodeComponent({ id, data, selected }: NodeProps & { data: MachineNodeData }) {
  const { recipe } = data
  const multiMachines = useMultiMachines()
  const isExtractor = multiMachines.some((mm) => mm.machines.some((v) => v.name === data.machine.name))

  const inputs = recipe?.inputs ?? []
  const outputs = recipe?.outputs ?? []
  // UI-only: when autoNMachines is present AND the node is not user-locked, show totals
  // scaled by the effective (supply-limited) count. When autoLocked, the user has
  // explicitly set nMachines, so use that value — autoNMachines may be stale.
  const effectiveN = !data.autoLocked && data.autoNMachines ? data.autoNMachines : data.nMachines
  const baseRates = calcNodeRates({ ...data, nMachines: effectiveN }, multiMachines)
  const effectiveRates = data.effectiveRates ?? baseRates

  return (
    <div className={`min-w-[240px] rounded-lg border bg-slate-900 shadow-xl shadow-black/50 relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-amber-500/40'}`}>
      {inputs.map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: itemHandleTop(i) }}
          className="!w-3 !h-3 !bg-blue-500 !border-blue-300 hover:!bg-blue-400 cursor-pointer"
        />
      ))}

      <MachineNodeHeader id={id} data={data} />
      <MachineNodeBody id={id} data={data} baseRates={baseRates} effectiveRates={effectiveRates} isExtractor={isExtractor} />

      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: itemHandleTop(i) }}
          className="!w-3 !h-3 !bg-emerald-500 !border-emerald-300 hover:!bg-emerald-400 cursor-pointer"
        />
      ))}
    </div>
  )
}

export const MachineNode = memo(MachineNodeComponent)
