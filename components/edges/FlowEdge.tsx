'use client'

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { useState } from 'react'
import { useFactoryStore } from '@/store/factoryStore'
import { partNameToIconPath } from '@/lib/utils/iconName'
import { getEdgePartName } from '@/lib/utils/edgePart'

export function FlowEdge(props: EdgeProps) {
  const nodes = useFactoryStore((s) => s.nodes)
  const edges = useFactoryStore((s) => s.edges)
  const [path, labelX, labelY] = getBezierPath(props)

  const part = getEdgePartName(props, nodes, edges)
  const iconSrc = part ? partNameToIconPath(part) : null
  const labelText = (props.data as { labelText?: string | null } | undefined)?.labelText ?? null
  const [hideIcon, setHideIcon] = useState(false)

  return (
    <>
      <BaseEdge path={path} style={props.style} markerEnd={props.markerEnd} />
      {(labelText || (iconSrc && !hideIcon)) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="flex flex-col items-center"
          >
            {iconSrc && !hideIcon && (
              <img
                src={iconSrc}
                alt={part ?? ''}
                className="mb-1 h-7 w-7 drop-shadow"
                draggable={false}
                onError={() => setHideIcon(true)}
              />
            )}
            {labelText && (
              <div className="rounded-md border border-slate-700 bg-slate-900/90 px-1.5 py-1 text-[10px] font-semibold text-slate-100 shadow-lg">
                <div className="text-center">{labelText}</div>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

