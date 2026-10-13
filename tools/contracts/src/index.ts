import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('logiclab-api'),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export * from './truth-table';
export * from './auth';
export * from './classroom';
