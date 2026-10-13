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

export const invitationResponseSchema = z.strictObject({ invitation: z.strictObject({
  code: z.string().regex(/^[A-Za-z0-9_-]{32}$/), expiresAt: z.iso.datetime(),
}) });
export type ClassroomInvitation = z.infer<typeof invitationResponseSchema>['invitation'];

export const joinClassroomRequestSchema = z.strictObject({ code: z.string().trim().regex(/^[A-Za-z0-9_-]{32}$/) });

export type CreateClassroomRequest = z.infer<typeof createClassroomRequestSchema>;
export type ClassroomResponse = z.infer<typeof classroomResponseSchema>;
export type ClassroomListQuery = z.infer<typeof classroomListQuerySchema>;
export type ClassroomParams = z.infer<typeof classroomParamsSchema>;
export type ClassroomListResponse = z.infer<typeof classroomListResponseSchema>;
export type JoinClassroomRequest = z.infer<typeof joinClassroomRequestSchema>;
