import { z } from 'zod';
import { assignmentSummarySchema } from './assignment';
import {
  truthTableAnswerSchema,
  truthTableCheckResponseSchema,
  truthTableExerciseResponseSchema,
  truthTableSolutionResponseSchema,
} from './truth-table';

export const gradedSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('truth_table_v1'),
  items: z
    .array(z.strictObject({ itemId: z.uuid(), feedback: truthTableCheckResponseSchema }))
    .max(50),
  summary: truthTableCheckResponseSchema.shape.summary,
});
export type GradedSubmissionResult = z.infer<typeof gradedSubmissionResultSchema>;
export const completionCountsSchema = z.strictObject({
  completedCells: z.number().int().nonnegative(),
  totalCells: z.number().int().nonnegative(),
});
export const completionSubmissionResultSchema = z.strictObject({
  gradingVersion: z.literal('completion_v1'),
  items: z.array(completionCountsSchema.extend({ itemId: z.uuid() })).max(50),
  summary: completionCountsSchema,
});
export type CompletionSubmissionResult = z.infer<typeof completionSubmissionResultSchema>;
export const submissionResultSchema = z.discriminatedUnion('gradingVersion', [
  gradedSubmissionResultSchema,
  completionSubmissionResultSchema,
]);
export type SubmissionResult = z.infer<typeof submissionResultSchema>;
export const studentAttemptSchema = z.strictObject({
  id: z.uuid(),
  revision: z.number().int().nonnegative(),
  answers: z.record(z.uuid(), z.array(truthTableAnswerSchema).max(4096)),
  submittedAt: z.iso.datetime().nullable(),
  result: submissionResultSchema.nullable(),
  gradePending: z.boolean().optional(),
});
export type StudentAttempt = z.infer<typeof studentAttemptSchema>;
export const studentAssignmentSchema = assignmentSummarySchema.safeExtend({
  items: z
    .array(
      z.strictObject({
        id: z.uuid(),
        position: z.number().int().positive(),
        title: z.string(),
        instructions: z.string().nullable(),
        formula: z.string(),
        exercise: truthTableExerciseResponseSchema,
      }),
    )
    .max(50),
});
export type StudentAssignment = z.infer<typeof studentAssignmentSchema>;

export const studentClassParamsSchema = z.strictObject({ classId: z.uuid() });
export type StudentClassParams = z.infer<typeof studentClassParamsSchema>;
export const studentAssignmentParamsSchema = z.strictObject({ assignmentId: z.uuid() });
export type StudentAssignmentParams = z.infer<typeof studentAssignmentParamsSchema>;
export const studentItemParamsSchema = studentAssignmentParamsSchema.extend({ itemId: z.uuid() });
export type StudentItemParams = z.infer<typeof studentItemParamsSchema>;
export const studentAssignmentListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type StudentAssignmentListQuery = z.infer<typeof studentAssignmentListQuerySchema>;
export const saveStudentAnswersSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
  itemId: z.uuid(),
  answers: z.array(truthTableAnswerSchema).max(4096),
});
export type SaveStudentAnswers = z.infer<typeof saveStudentAnswersSchema>;
export const submitStudentAttemptSchema = z.strictObject({
  revision: z.number().int().nonnegative().max(2147483646),
});
export type SubmitStudentAttempt = z.infer<typeof submitStudentAttemptSchema>;

export const studentAssignmentListResponseSchema = z.strictObject({
  assignments: z.array(assignmentSummarySchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type StudentAssignmentListResponse = z.infer<typeof studentAssignmentListResponseSchema>;
export const studentAssignmentResponseSchema = z.strictObject({
  assignment: studentAssignmentSchema,
  attempt: studentAttemptSchema.nullable(),
});
export type StudentAssignmentResponse = z.infer<typeof studentAssignmentResponseSchema>;
export const studentAttemptResponseSchema = z.strictObject({ attempt: studentAttemptSchema });
export type StudentAttemptResponse = z.infer<typeof studentAttemptResponseSchema>;
export const studentSolutionResponseSchema = z.strictObject({
  itemId: z.uuid(),
  solution: truthTableSolutionResponseSchema,
});
export type StudentSolutionResponse = z.infer<typeof studentSolutionResponseSchema>;
export const studentWorkErrorResponseSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string() }),
});
export type StudentWorkErrorResponse = z.infer<typeof studentWorkErrorResponseSchema>;

/** Explicit checking evaluates these transient answers; it does not save or submit them. */
export const checkStudentAnswersSchema = z.strictObject({
  itemId: z.uuid(),
  answers: z.array(truthTableAnswerSchema).max(4096),
});
export type CheckStudentAnswers = z.infer<typeof checkStudentAnswersSchema>;
export const studentCheckResponseSchema = z.strictObject({
  itemId: z.uuid(),
  feedback: truthTableCheckResponseSchema,
});
export type StudentCheckResponse = z.infer<typeof studentCheckResponseSchema>;
