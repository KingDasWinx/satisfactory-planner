export type FlowViewport = { x: number; y: number; zoom: number }

export type HelperGuideLine =
  | { axis: 'x'; kind: 'left' | 'centerX' | 'right'; position: number; targetId: string }
  | { axis: 'y'; kind: 'top' | 'centerY' | 'bottom'; position: number; targetId: string }

export type HelperSpacingGuide =
  | { axis: 'x'; x0: number; x1: number; y: number; gap: number }
  | { axis: 'y'; y0: number; y1: number; x: number; gap: number }

export type HelperLinesState = {
  draggedIds: string[]
  snapPositionById: Record<string, { x: number; y: number }>
  guides: HelperGuideLine[]
  spacing: HelperSpacingGuide[]
}

