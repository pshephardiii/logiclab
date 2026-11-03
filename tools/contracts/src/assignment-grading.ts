import { z } from 'zod';
import { ASSIGNMENT_POINT_LIMITS } from './assignment-scoring';

export const INSTRUCTOR_GRADING_LIMITS = {
  maxCommentLength: 4000,
  maxRevision: 2147483647,
} as const;

const revisionSchema = z.number().int().min(0).max(INSTRUCTOR_GRADING_LIMITS.maxRevision);
const itemFields = {
  itemId: z.uuid().transform((id) => id.toLowerCase()),
  // Null retains/reinstates the automatic award; it does not resolve a pending automatic grade.
  earnedPoints: z
    .number()
    .min(0)
    .max(ASSIGNMENT_POINT_LIMITS.maxPoints)
    .multipleOf(0.01)
    .nullable(),
  comment: z.string().trim().min(1).max(INSTRUCTOR_GRADING_LIMITS.maxCommentLength).nullable(),
};

export const instructorItemGradeSchema = z.strictObject(itemFields);
export type InstructorItemGrade = z.infer<typeof instructorItemGradeSchema>;

/** Actor/timestamp and frozen maxima come from the server, never the grading request. */
export const updateSubmissionGradingSchema = z.strictObject({
  revision: revisionSchema,
  items: z
    .array(instructorItemGradeSchema)
    .min(1)
    .max(ASSIGNMENT_POINT_LIMITS.maxItems)
    .refine(
      (items) => new Set(items.map((item) => item.itemId)).size === items.length,
      'Each assigned occurrence may be changed only once per request.',
    ),
});
export type UpdateSubmissionGrading = z.infer<typeof updateSubmissionGradingSchema>;

export const instructorGradingEntrySchema = z.strictObject({
  ...itemFields,
  reviewedBy: z.uuid().transform((id) => id.toLowerCase()),
  reviewedAt: z.iso.datetime(),
});
export type InstructorGradingEntry = z.infer<typeof instructorGradingEntrySchema>;

/** Latest instructor decisions, separate from frozen automatic scores and append-only history. */
export const instructorGradingSchema = z
  .strictObject({
    gradingVersion: z.literal('instructor_grading_v1'),
    revision: revisionSchema,
    items: z.array(instructorGradingEntrySchema).max(ASSIGNMENT_POINT_LIMITS.maxItems),
  })
  .superRefine((grading, context) => {
    if (new Set(grading.items.map((item) => item.itemId)).size !== grading.items.length)
      context.addIssue({
        code: 'custom',
        message: 'Instructor grading occurrences must be unique.',
      });
    if ((grading.revision === 0) !== (grading.items.length === 0))
      context.addIssue({
        code: 'custom',
        message: 'Initial grading is empty; saved decisions need a positive revision.',
      });
  });
export type InstructorGrading = z.infer<typeof instructorGradingSchema>;
