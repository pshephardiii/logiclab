import { z } from 'zod';

// Reusable field and data shapes.
// Authored names/codes are trimmed; response values must already be normalized.
const classroomNameSchema = z.string().min(1).max(120);
const invitationCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/);

export const classroomSchema = z.strictObject({
  id: z.uuid(),
  name: classroomNameSchema,
  createdAt: z.iso.datetime(),
});
export type ClassroomSummary = z.infer<typeof classroomSchema>;

export const classroomInvitationSchema = z.strictObject({
  code: invitationCodeSchema,
  expiresAt: z.iso.datetime(),
});
export type ClassroomInvitation = z.infer<typeof classroomInvitationSchema>;

// Request contracts.
export const createClassroomRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
});
export type CreateClassroomRequest = z.infer<typeof createClassroomRequestSchema>;

export const joinClassroomRequestSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{32}$/),
});
export type JoinClassroomRequest = z.infer<typeof joinClassroomRequestSchema>;

export const classroomListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export type ClassroomListQuery = z.infer<typeof classroomListQuerySchema>;

export const classroomParamsSchema = z.strictObject({
  classId: z.uuid(),
});
export type ClassroomParams = z.infer<typeof classroomParamsSchema>;

// Response contracts.
export const classroomResponseSchema = z.strictObject({
  classroom: classroomSchema,
});
export type ClassroomResponse = z.infer<typeof classroomResponseSchema>;

export const classroomListResponseSchema = z.strictObject({
  classrooms: z.array(classroomSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type ClassroomListResponse = z.infer<typeof classroomListResponseSchema>;

export const invitationResponseSchema = z.strictObject({
  invitation: classroomInvitationSchema,
});
export type InvitationResponse = z.infer<typeof invitationResponseSchema>;
