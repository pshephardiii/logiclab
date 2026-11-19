import { UserRole } from './user-role';
import { z } from 'zod';

export const demoRoleRequestSchema = z.strictObject({
  role: z.enum([UserRole.Instructor, UserRole.Student]),
});

export const demoEmptyRequestSchema = z
  .strictObject({})
  .nullish()
  .transform((value) => value ?? {});

export const demoSessionResponseSchema = z.strictObject({
  mode: z.literal('demo'),
  user: z.strictObject({ id: z.uuid(), role: z.enum([UserRole.Instructor, UserRole.Student]) }),
  workspace: z.strictObject({ id: z.uuid(), generation: z.number().int().positive() }),
  notice: z.string(),
});

export type DemoSessionResponse = z.infer<typeof demoSessionResponseSchema>;

export const demoMessageResponseSchema = z.strictObject({ message: z.string() });
