import { z } from 'zod';

// Response contract. Preserve the existing non-strict object behavior.
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('logiclab-api'),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
