import { z } from 'zod';
import { mixedCompletionSubmissionResultSchema } from './assignment-responses';
import {
  gradedSubmissionResultSchema,
  completionCountsSchema,
  studentAssignmentSchema,
  studentAttemptSchema,
} from './student-work';
import { assignmentParamsSchema } from './assignment';

export const submissionSummarySchema = z.strictObject({
  id: z.uuid(),
  student: z.strictObject({ id: z.uuid(), email: z.string().nullable() }),
  submittedAt: z.iso.datetime(),
  summary: z.union([
    gradedSubmissionResultSchema.shape.summary,
    completionCountsSchema,
    mixedCompletionSubmissionResultSchema.shape.summary,
  ]),
});
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;
export const submissionReviewSchema = z.strictObject({
  submission: submissionSummarySchema,
  assignment: studentAssignmentSchema,
  attempt: studentAttemptSchema,
});
export type SubmissionReview = z.infer<typeof submissionReviewSchema>;
export const submissionParamsSchema = assignmentParamsSchema.extend({ submissionId: z.uuid() });
export type SubmissionParams = z.infer<typeof submissionParamsSchema>;
export const submissionListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
export const submissionListResponseSchema = z.strictObject({
  submissions: z.array(submissionSummarySchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});
export type SubmissionListResponse = z.infer<typeof submissionListResponseSchema>;
