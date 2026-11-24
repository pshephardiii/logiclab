import {
  AssessmentMode,
  FeedbackTiming,
  GradeReleaseTiming,
  SolutionAccess,
  assessmentModeSchema,
  feedbackTimingSchema,
} from './assignment-policy-values';
import { ProblemType } from './problem-type';
import {
  assignmentItemPointsSchema,
  assignmentPointAllocationsSchema,
  weightedAssignmentItemsSchema,
} from './assignment-scoring';
import { gradeReleaseTimingSchema } from './assignment-policy-values';
import { z } from 'zod';
import { assignmentLearningPolicySchema, solutionAccessSchema } from './assignment-learning-policy';
import { assignmentProblemVersionSchema } from './assignment-problem';

export { assignmentProblemDefinitionSchema } from './assignment-problem';
export type { AssignmentProblemDefinition } from './assignment-problem';

// Independent policy dimensions; additional modes require application/database support.
export const assignmentPolicySchema = z
  .strictObject({
    assessmentMode: assessmentModeSchema,
    feedbackTiming: feedbackTimingSchema,
    solutionAccess: solutionAccessSchema,
    gradeReleaseTiming: gradeReleaseTimingSchema.optional(),
  })
  .refine(
    (policy) =>
      assignmentLearningPolicySchema.safeParse({
        assessmentMode: policy.assessmentMode,
        feedbackTiming: policy.feedbackTiming,
        solutionAccess: policy.solutionAccess,
      }).success,
    'Unsupported assignment learning policy.',
  )
  .refine(
    (policy) =>
      policy.assessmentMode === AssessmentMode.Graded ||
      policy.gradeReleaseTiming !== GradeReleaseTiming.InstructorRelease,
    'Only graded work has grade release.',
  );

export type AssignmentPolicy = z.infer<typeof assignmentPolicySchema>;

export const assignmentSummarySchema = assignmentPolicySchema.safeExtend({
  id: z.uuid(),
  classId: z.uuid(),
  title: z.string().min(1).max(120),
  instructions: z.string().max(5000).nullable(),
  gradesReleasedAt: z.iso.datetime().nullable().optional(),
  answersRevealedAt: z.iso.datetime().nullable().optional(),
  publishedAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AssignmentSummary = z.infer<typeof assignmentSummarySchema>;

export const assignmentItemSchema = z.strictObject({
  id: z.uuid(),
  position: z.number().int().positive(),
  maxPoints: assignmentItemPointsSchema.optional(),
  problemVersion: assignmentProblemVersionSchema,
});

export type AssignmentItem = z.infer<typeof assignmentItemSchema>;

/** Owner-only details may carry private references. Students use separate redacted work contracts. */
export const assignmentSchema = assignmentSummarySchema
  .safeExtend({
    items: z.array(assignmentItemSchema).max(50),
  })
  .refine(
    (assignment) =>
      assignment.assessmentMode === AssessmentMode.UngradedPractice ||
      ([AssessmentMode.Graded, AssessmentMode.CompletionOnly].some(
        (candidate) => candidate === assignment.assessmentMode,
      ) &&
        assignment.feedbackTiming === FeedbackTiming.OnSubmission) ||
      !assignment.items.some(
        (item) => item.problemVersion.definition.type === ProblemType.Derivation,
      ),
    'Graded and completion-only derivations require feedback at submission.',
  );

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

export const createAssignmentRequestSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120),
    instructions: z.string().trim().max(5000).nullable().optional(),
    problemVersionIds: z.array(z.uuid()).max(50).default([]),
    items: weightedAssignmentItemsSchema.optional(),
    assessmentMode: assessmentModeSchema.default(AssessmentMode.Graded),
    feedbackTiming: feedbackTimingSchema.default(FeedbackTiming.OnSubmission),
    solutionAccess: solutionAccessSchema.default(SolutionAccess.Never),
    gradeReleaseTiming: gradeReleaseTimingSchema.optional(),
  })
  .refine(
    (policy) =>
      assignmentLearningPolicySchema.safeParse({
        assessmentMode: policy.assessmentMode,
        feedbackTiming: policy.feedbackTiming,
        solutionAccess: policy.solutionAccess,
      }).success,
    'Unsupported assignment learning policy.',
  )
  .refine(
    (policy) =>
      policy.assessmentMode === AssessmentMode.Graded ||
      policy.gradeReleaseTiming !== GradeReleaseTiming.InstructorRelease,
    'Only graded work has grade release.',
  )
  .refine(
    (input) => input.items === undefined || input.problemVersionIds.length === 0,
    'Use items or problemVersionIds, not both.',
  )
  .refine(
    (input) => input.items === undefined || input.assessmentMode === AssessmentMode.Graded,
    'Only graded assignments use points.',
  );

export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequestSchema>;

// No creation defaults here: omitted PATCH fields retain their saved values.
export const updateAssignmentRequestSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    instructions: z.string().trim().max(5000).nullable().optional(),
    problemVersionIds: z.array(z.uuid()).max(50).optional(),
    items: weightedAssignmentItemsSchema.optional(),
    pointAllocations: assignmentPointAllocationsSchema.optional(),
    assessmentMode: assessmentModeSchema.optional(),
    feedbackTiming: feedbackTimingSchema.optional(),
    solutionAccess: solutionAccessSchema.optional(),
    gradeReleaseTiming: gradeReleaseTimingSchema.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    'Provide at least one assignment field.',
  )
  .refine(
    (input) =>
      input.items === undefined ||
      (input.problemVersionIds === undefined && input.pointAllocations === undefined),
    'Use weighted items without another item list or allocation list.',
  )
  .refine(
    (input) => input.problemVersionIds === undefined || input.pointAllocations === undefined,
    'Change item order and weights together using items.',
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
