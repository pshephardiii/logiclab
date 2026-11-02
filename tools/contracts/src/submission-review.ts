import { proofCompletionSubmissionResultSchema } from './proof-submission';
import { savedStudentAssignmentSchema, savedStudentResponsesSchema } from './saved-student-work';
import { assignmentScoreSchema } from './assignment-scoring';
import { z } from 'zod';
import { mixedCompletionSubmissionResultSchema } from './assignment-responses';
import {
  gradedSubmissionResultSchema,
  completionCountsSchema,
  studentAttemptSchema,
} from './student-work';
import { assignmentParamsSchema } from './assignment';

export const submissionSummarySchema = z
  .strictObject({
    id: z.uuid(),
    student: z.strictObject({ id: z.uuid(), email: z.string().nullable() }),
    submittedAt: z.iso.datetime(),
    score: assignmentScoreSchema.optional(),
    summary: z.union([
      gradedSubmissionResultSchema.shape.summary,
      completionCountsSchema,
      mixedCompletionSubmissionResultSchema.shape.summary,
      proofCompletionSubmissionResultSchema.shape.summary,
    ]),
  })
  .refine(
    (value) => !('proofVerification' in value.summary) || value.score === undefined,
    'Completion verification cannot carry a point score.',
  );
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;
const completedProofAttemptSchema = studentAttemptSchema.extend({
  answers: savedStudentResponsesSchema,
  submittedAt: z.iso.datetime(),
  result: proofCompletionSubmissionResultSchema,
  score: z.never().optional(),
  gradePending: z.literal(false),
});

export const submissionReviewSchema = z
  .strictObject({
    submission: submissionSummarySchema,
    assignment: savedStudentAssignmentSchema,
    attempt: z.union([studentAttemptSchema, completedProofAttemptSchema]),
  })
  .superRefine((review, context) => {
    const hasProof = review.assignment.items.some(
      (item) => 'content' in item && item.content.type === 'derivation',
    );
    const proofResult = review.attempt.result?.gradingVersion === 'proof_completion_v1';
    if (hasProof || proofResult || 'proofVerification' in review.submission.summary) {
      if (
        !hasProof ||
        !proofResult ||
        review.assignment.assessmentMode !== 'completion_only' ||
        review.assignment.feedbackTiming !== 'on_submission' ||
        review.submission.id !== review.attempt.id ||
        review.submission.submittedAt !== review.attempt.submittedAt ||
        JSON.stringify(review.submission.summary) !== JSON.stringify(review.attempt.result?.summary)
      )
        context.addIssue({
          code: 'custom',
          message: 'Proof review requires a matching final completion submission.',
        });
    }
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
