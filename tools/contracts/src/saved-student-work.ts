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
  studentAssignmentItemSchema,
  studentAssignmentItemFields,
  saveStudentAnswersSchema,
  checkStudentAnswersSchema,
  studentCheckResponseSchema,
  studentSolutionResponseSchema,
} from './student-work';

/** Staged persistence projections. Active HTTP contracts remain narrower until consumers are ready. */
export const savedStudentResponseValueSchema = z.union([
  assignmentResponseValueSchema,
  derivationAnswerSchema,
]);
export const savedStudentResponsesSchema = z
  .record(z.uuid(), savedStudentResponseValueSchema)
  .refine((responses) => Object.keys(responses).length <= 50, 'At most 50 assigned occurrences.');
export type SavedStudentResponses = z.infer<typeof savedStudentResponsesSchema>;
export const savedStudentAttemptSchema = studentAttemptSchema.extend({
  answers: savedStudentResponsesSchema,
});
export type SavedStudentAttempt = z.infer<typeof savedStudentAttemptSchema>;
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
