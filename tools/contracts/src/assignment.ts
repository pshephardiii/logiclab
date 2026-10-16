import { z } from 'zod';
import { problemVersionSchema } from './problem';

// Independent policy dimensions; additional modes require application/database support.
export const assignmentPolicySchema = z.strictObject({
  assessmentMode: z.literal('graded'),
  feedbackTiming: z.literal('on_submission'),
  allowSolutions: z.boolean(),
});
export type AssignmentPolicy = z.infer<typeof assignmentPolicySchema>;

export const assignmentSummarySchema = assignmentPolicySchema.extend({
  id: z.uuid(),
  classId: z.uuid(),
  title: z.string().min(1).max(120),
  instructions: z.string().max(5000).nullable(),
  publishedAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type AssignmentSummary = z.infer<typeof assignmentSummarySchema>;

export const assignmentItemSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().positive(),
  problemVersion: problemVersionSchema,
});
export type AssignmentItem = z.infer<typeof assignmentItemSchema>;
export const assignmentSchema = assignmentSummarySchema.extend({
  items: z.array(assignmentItemSchema).max(50),
});
export type AssignmentDetail = z.infer<typeof assignmentSchema>;

export const assignmentClassParamsSchema = z.strictObject({ classId: z.uuid() });
export type AssignmentClassParams = z.infer<typeof assignmentClassParamsSchema>;
export const assignmentParamsSchema = z.strictObject({ assignmentId: z.uuid() });
export type AssignmentParams = z.infer<typeof assignmentParamsSchema>;
export const assignmentListQuerySchema = z.strictObject({
  archive: z.enum(['active', 'archived', 'all']).default('active'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;

export const createAssignmentRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  instructions: z.string().trim().max(5000).nullable().optional(),
  problemVersionIds: z.array(z.uuid()).max(50).default([]),
  assessmentMode: z.literal('graded').default('graded'),
  feedbackTiming: z.literal('on_submission').default('on_submission'),
  allowSolutions: z.boolean().default(false),
});
export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequestSchema>;

// No creation defaults here: omitted PATCH fields retain their saved values.
export const updateAssignmentRequestSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    instructions: z.string().trim().max(5000).nullable().optional(),
    problemVersionIds: z.array(z.uuid()).max(50).optional(),
    assessmentMode: z.literal('graded').optional(),
    feedbackTiming: z.literal('on_submission').optional(),
    allowSolutions: z.boolean().optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one assignment field.',
  );
export type UpdateAssignmentRequest = z.infer<typeof updateAssignmentRequestSchema>;
export const assignmentActionRequestSchema = z.strictObject({});
export type AssignmentActionRequest = z.infer<typeof assignmentActionRequestSchema>;

export const assignmentResponseSchema = z.strictObject({ assignment: assignmentSchema });
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export const assignmentListResponseSchema = z.strictObject({
  assignments: z.array(assignmentSummarySchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type AssignmentListResponse = z.infer<typeof assignmentListResponseSchema>;
export const assignmentErrorResponseSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string() }),
});
export type AssignmentErrorResponse = z.infer<typeof assignmentErrorResponseSchema>;
