import { z } from 'zod';

export const createClassroomRequestSchema = z.strictObject({ name: z.string().trim().min(1).max(120) });
export const classroomSchema = z.strictObject({ id: z.uuid(), name: z.string().min(1).max(120), createdAt: z.iso.datetime() });
export const classroomResponseSchema = z.strictObject({ classroom: classroomSchema });
export const classroomListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export const classroomParamsSchema = z.strictObject({ classId: z.uuid() });
export const classroomListResponseSchema = z.strictObject({ classrooms: z.array(classroomSchema), nextOffset: z.number().int().nonnegative().nullable() });
export type ClassroomSummary = z.infer<typeof classroomSchema>;
