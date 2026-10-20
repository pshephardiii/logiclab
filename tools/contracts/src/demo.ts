import { z } from 'zod';

export const demoRoleRequestSchema = z.strictObject({ role: z.enum(['instructor', 'student']) });
export const demoEmptyRequestSchema = z
  .strictObject({})
  .nullish()
  .transform((value) => value ?? {});
export const demoSessionResponseSchema = z.strictObject({
  mode: z.literal('demo'),
  user: z.strictObject({ id: z.uuid(), role: z.enum(['instructor', 'student']) }),
  workspace: z.strictObject({ id: z.uuid(), generation: z.number().int().positive() }),
  notice: z.string(),
});
export type DemoSessionResponse = z.infer<typeof demoSessionResponseSchema>;
export const demoMessageResponseSchema = z.strictObject({ message: z.string() });
