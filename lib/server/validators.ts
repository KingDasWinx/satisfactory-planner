import 'server-only'

import { z } from 'zod'

export const CreateCloudProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(''),
  visibility: z.enum(['PRIVATE', 'COMMUNITY']).default('PRIVATE'),
})

export const SaveSnapshotSchema = z.object({
  data: z.unknown(),
})

export const ForkSchema = z.object({
  target: z.enum(['local', 'cloud']),
})

export function assertMaxJsonSize(value: unknown, maxBytes: number): void {
  const size = Buffer.byteLength(JSON.stringify(value), 'utf8')
  if (size > maxBytes) throw new Error('PAYLOAD_TOO_LARGE')
}

