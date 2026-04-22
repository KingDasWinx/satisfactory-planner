'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useMultiMachines } from '@/lib/hooks/useMultiMachines'
import { calcNodeRates } from '@/lib/flowCalc'
import { MachineNodeHeader } from './MachineNodeHeader'
import { MachineNodeBody } from './MachineNodeBody'
import type { MachineNodeData } from '@/lib/types/store'

function MachineNodeComponent({ id, data, selected }: NodeProps & { data: MachineNodeData }) {
  const { recipe } = data
  const multiMachines = useMultiMachines()
  const isExtractor = multiMachines.some((mm) => mm.machines.some((v) => v.name === data.machine.name))

  const inputs = recipe?.inputs ?? []
  const outputs = recipe?.outputs ?? []
  const handleCount = Math.max(inputs.length, outputs.length, 1)
  const rates = calcNodeRates(data, multiMachines)

  return (
    <div className={`min-w-[240px] rounded-lg border bg-slate-900 shadow-xl shadow-black/50 relative transition-all duration-200 ${selected ? 'border-amber-400 selected-node-glow' : 'border-amber-500/40'}`}>
      {inputs.map((_, i) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{ top: `${((i + 1) / (handleCount + 1)) * 100}%` }}
          className="!w-3 !h-3 !bg-blue-500 !border-blue-300 hover:!bg-blue-400 cursor-pointer"
        />
      ))}

      <MachineNodeHeader id={id} data={data} />
      <MachineNodeBody id={id} data={data} rates={rates} isExtractor={isExtractor} />

      {outputs.map((_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{ top: `${((i + 1) / (handleCount + 1)) * 100}%` }}
          className="!w-3 !h-3 !bg-emerald-500 !border-emerald-300 hover:!bg-emerald-400 cursor-pointer"
        />
      ))}
    </div>
  )
}

export const MachineNode = memo(MachineNodeComponent)
