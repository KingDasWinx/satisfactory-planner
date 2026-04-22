import type { ReactFlowInstance } from '@xyflow/react'

export async function exportCanvasToPng(rfInstance: ReactFlowInstance, projectName: string): Promise<void> {
  // toPng retorna data URL com o canvas renderizado; padding garante margens no export
  const dataUrl = await (rfInstance as unknown as { toSvg: unknown } & {
    toPng: (opts: { quality: number; backgroundColor: string; padding: number }) => Promise<string>
  }).toPng({
    quality: 1,
    backgroundColor: '#0f1117',
    padding: 40,
  })

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${projectName || 'fabrica'}.png`
  link.click()
}
