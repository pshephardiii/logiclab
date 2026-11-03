import {
  proofSubmissionResultSchema,
  proofCompletionSubmissionResultSchema,
} from './proof-submission';
import { z } from 'zod';
import { assignmentSummarySchema } from './assignment';
import { assignmentResponseValueSchema } from './assignment-responses';
import {
  derivationAnswerSchema,
  saveDerivationAnswersSchema,
  checkDerivationAnswersSchema,
  derivationCheckFeedbackSchema,
} from './derivation-work';
import { derivationContentSchema, derivationSolutionSchema } from './derivation';
import {
  studentAttemptSchema,
  submissionResultSchema,
  studentAssignmentItemSchema,
  studentAssignmentItemFields,
  saveStudentAnswersSchema,
  checkStudentAnswersSchema,
  studentCheckResponseSchema,
  studentSolutionResponseSchema,
} from './student-work';

/** Proof-aware saved-work projections; supported assignment admission is enforced separately. */
export const savedStudentResponseValueSchema = z.union([
  assignmentResponseValueSchema,
  derivationAnswerSchema,
]);
export type SavedStudentResponseValue = z.infer<typeof savedStudentResponseValueSchema>;
export const savedStudentResponsesSchema = z
  .record(z.uuid(), savedStudentResponseValueSchema)
  .refine((responses) => Object.keys(responses).length <= 50, 'At most 50 assigned occurrences.');
export type SavedStudentResponses = z.infer<typeof savedStudentResponsesSchema>;
export const savedStudentAttemptSchema = studentAttemptSchema
  .extend({
    answers: savedStudentResponsesSchema,
    result: z
      .union([
        submissionResultSchema,
        proofSubmissionResultSchema,
        proofCompletionSubmissionResultSchema,
      ])
      .nullable(),
  })
  .superRefine((attempt, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });
    if (
      attempt.gradePending &&
      (attempt.result !== null ||
        attempt.score != null ||
        attempt.automaticScore ||
        attempt.instructorGrading)
    )
      reject('Withheld results cannot include scores, reports or instructor decisions.');
    if (Boolean(attempt.automaticScore) !== Boolean(attempt.instructorGrading))
      reject('Instructor decisions require their separate automatic score.');
    if (attempt.instructorGrading && attempt.automaticScore) {
      if (
        !attempt.submittedAt ||
        !attempt.result ||
        !['truth_table_v1', 'mixed_v1', 'proof_mixed_v1'].includes(attempt.result.gradingVersion) ||
        !attempt.score
      )
        reject('Instructor grading requires visible final graded work.');
      const automatic = new Map(attempt.automaticScore.items.map((item) => [item.itemId, item]));
      const decisions = new Map(attempt.instructorGrading.items.map((item) => [item.itemId, item]));
      if (
        attempt.instructorGrading.items.some((item) => !automatic.has(item.itemId)) ||
        attempt.score?.items.length !== automatic.size
      )
        reject('Instructor decisions must match frozen scored occurrences.');
      for (const item of attempt.score?.items ?? []) {
        const original = automatic.get(item.itemId);
        const award = decisions.get(item.itemId)?.earnedPoints;
        if (
          !original ||
          item.maxPoints !== original.maxPoints ||
          (award != null
            ? item.status !== 'graded' || item.earnedPoints !== award
            : item.status !== original.status || item.earnedPoints !== original.earnedPoints)
        )
          reject('Effective points must match automatic scores and instructor awards.');
      }
    }
    if (
      attempt.result?.gradingVersion === 'proof_completion_v1' &&
      (!attempt.submittedAt || attempt.score != null)
    )
      context.addIssue({
        code: 'custom',
        message: 'Retained proof completion requires final submission without a point score.',
      });
    if (
      attempt.result?.gradingVersion === 'proof_mixed_v1' &&
      (!attempt.submittedAt || !attempt.score)
    )
      context.addIssue({
        code: 'custom',
        message: 'Retained proof results require final submission and a point snapshot.',
      });
  });
export type SavedStudentAttempt = z.infer<typeof savedStudentAttemptSchema>;
export const savedStudentAttemptResponseSchema = z.strictObject({
  attempt: savedStudentAttemptSchema,
});
export const savedStudentAssignmentSchema = assignmentSummarySchema.safeExtend({
  items: z
    .array(
      z.union([
        studentAssignmentItemSchema,
        z.strictObject({ ...studentAssignmentItemFields, content: derivationContentSchema }),
      ]),
    )
    .max(50),
});
export type SavedStudentAssignment = z.infer<typeof savedStudentAssignmentSchema>;
export const savedStudentAssignmentResponseSchema = z.strictObject({
  assignment: savedStudentAssignmentSchema,
  attempt: savedStudentAttemptSchema.nullable(),
});
export type SavedStudentAssignmentResponse = z.infer<typeof savedStudentAssignmentResponseSchema>;
export const savedStudentAnswersSchema = z.union([
  saveStudentAnswersSchema,
  saveDerivationAnswersSchema,
]);
export type SavedStudentAnswers = z.infer<typeof savedStudentAnswersSchema>;

export const savedStudentCheckSchema = z.union([
  checkStudentAnswersSchema,
  checkDerivationAnswersSchema,
]);
export type SavedStudentCheck = z.infer<typeof savedStudentCheckSchema>;
export const savedStudentCheckResponseSchema = studentCheckResponseSchema.extend({
  feedback: z.union([studentCheckResponseSchema.shape.feedback, derivationCheckFeedbackSchema]),
});
export type SavedStudentCheckResponse = z.infer<typeof savedStudentCheckResponseSchema>;
export const savedStudentSolutionResponseSchema = studentSolutionResponseSchema.extend({
  solution: z.union([studentSolutionResponseSchema.shape.solution, derivationSolutionSchema]),
});
export type SavedStudentSolutionResponse = z.infer<typeof savedStudentSolutionResponseSchema>;
