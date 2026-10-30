import { z } from 'zod';

/** Whole-point allocations; earned scores are rounded to hundredths per occurrence. */
export const ASSIGNMENT_POINT_LIMITS = {
  defaultPoints: 10,
  minPoints: 1,
  maxPoints: 1000,
  maxItems: 50,
} as const;
export const assignmentItemPointsSchema = z
  .number()
  .int()
  .min(ASSIGNMENT_POINT_LIMITS.minPoints)
  .max(ASSIGNMENT_POINT_LIMITS.maxPoints);
export const weightedAssignmentItemsSchema = z
  .array(z.strictObject({ problemVersionId: z.uuid(), maxPoints: assignmentItemPointsSchema }))
  .max(ASSIGNMENT_POINT_LIMITS.maxItems);
export const assignmentPointAllocationSchema = z.strictObject({
  itemId: z.uuid().transform((id) => id.toLowerCase()),
  maxPoints: assignmentItemPointsSchema,
});
export type AssignmentPointAllocation = z.infer<typeof assignmentPointAllocationSchema>;
export const assignmentPointAllocationsSchema = z
  .array(assignmentPointAllocationSchema)
  .min(1)
  .max(ASSIGNMENT_POINT_LIMITS.maxItems)
  .refine(
    (items) => new Set(items.map((item) => item.itemId)).size === items.length,
    'Each assigned occurrence needs one point allocation.',
  );
const earnedPointsSchema = z
  .number()
  .min(0)
  .max(ASSIGNMENT_POINT_LIMITS.maxPoints)
  .multipleOf(0.01);
const itemFields = {
  itemId: z.uuid().transform((id) => id.toLowerCase()),
  maxPoints: assignmentItemPointsSchema,
};
export const assignmentItemScoreSchema = z
  .discriminatedUnion('status', [
    z.strictObject({
      ...itemFields,
      status: z.literal('graded'),
      earnedPoints: earnedPointsSchema,
    }),
    z.strictObject({ ...itemFields, status: z.literal('needs_review'), earnedPoints: z.null() }),
  ])
  .superRefine((item, context) => {
    if (item.earnedPoints !== null && item.earnedPoints > item.maxPoints)
      context.addIssue({ code: 'custom', message: 'Earned points cannot exceed the allocation.' });
  });
export type AssignmentItemScore = z.infer<typeof assignmentItemScoreSchema>;
const totalPointsSchema = z
  .number()
  .int()
  .min(1)
  .max(ASSIGNMENT_POINT_LIMITS.maxItems * ASSIGNMENT_POINT_LIMITS.maxPoints);
const summarySchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('graded'),
    maxPoints: totalPointsSchema,
    earnedPoints: z
      .number()
      .min(0)
      .max(ASSIGNMENT_POINT_LIMITS.maxItems * ASSIGNMENT_POINT_LIMITS.maxPoints)
      .multipleOf(0.01),
    percentage: z.number().min(0).max(100).multipleOf(0.01),
  }),
  z.strictObject({
    status: z.literal('needs_review'),
    maxPoints: totalPointsSchema,
    earnedPoints: z.null(),
    percentage: z.null(),
  }),
]);

/** Staged score snapshot, separate from immutable correctness reports and active result unions. */
export const assignmentScoreSchema = z
  .strictObject({
    scoringVersion: z.literal('points_v1'),
    items: z.array(assignmentItemScoreSchema).min(1).max(ASSIGNMENT_POINT_LIMITS.maxItems),
    summary: summarySchema,
  })
  .superRefine((score, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });
    if (new Set(score.items.map((item) => item.itemId)).size !== score.items.length)
      reject('Score occurrences must be unique.');
    const maxPoints = score.items.reduce((sum, item) => sum + item.maxPoints, 0);
    if (score.summary.maxPoints !== maxPoints) reject('The total allocation must match its items.');
    const pending = score.items.some((item) => item.status === 'needs_review');
    if (pending !== (score.summary.status === 'needs_review'))
      reject('Unfinished grading must keep the assignment pending.');
    if (score.summary.status === 'graded') {
      const hundredths = score.items.reduce(
        (sum, item) => sum + Math.round((item.earnedPoints ?? 0) * 100),
        0,
      );
      if (score.summary.earnedPoints !== hundredths / 100)
        reject('Earned totals must match their rounded items.');
      if (score.summary.percentage !== Math.round((hundredths * 100) / maxPoints) / 100)
        reject('Percentage must match the point total.');
    }
  });
export type AssignmentScore = z.infer<typeof assignmentScoreSchema>;
