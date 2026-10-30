import { z } from 'zod';
import {
  assignmentPointAllocationsSchema,
  assignmentScoreSchema,
  gradedSubmissionResultSchema,
  mixedGradedSubmissionResultSchema,
  type AssignmentPointAllocation,
  type AssignmentScore,
} from '@logiclab/contracts';

const summaryKeys = ['correct', 'incorrect', 'unanswered', 'total'] as const;

const outcomeSchema = z.discriminatedUnion('type', [
  z
    .strictObject({
      type: z.literal('correctness'),
      correct: z.number().int().min(0).max(1_000_000),
      total: z.number().int().min(1).max(1_000_000),
    })
    .refine((value) => value.correct <= value.total, 'Correct units cannot exceed total units.'),
  z.strictObject({ type: z.literal('full_credit') }),
  z.strictObject({ type: z.literal('needs_review') }),
]);
const outcomesSchema = z
  .array(
    z.strictObject({
      itemId: z.uuid().transform((id) => id.toLowerCase()),
      outcome: outcomeSchema,
    }),
  )
  .max(50);
export type AssignmentScoringOutcome = z.infer<typeof outcomesSchema>[number];

export class AssignmentScoringError extends Error {
  constructor() {
    super('Point allocations and scoring outcomes must match valid assigned occurrences.');
  }
}

/** Pure, staged calculation. Callers supply authoritative outcomes, never student-requested scores. */
export function scoreAssignment(
  allocations: AssignmentPointAllocation[],
  input: AssignmentScoringOutcome[],
): AssignmentScore {
  const parsedAllocations = assignmentPointAllocationsSchema.safeParse(allocations);
  const parsedOutcomes = outcomesSchema.safeParse(input);
  if (!parsedAllocations.success || !parsedOutcomes.success) throw new AssignmentScoringError();
  const outcomes = new Map(parsedOutcomes.data.map((item) => [item.itemId, item.outcome]));
  if (
    outcomes.size !== input.length ||
    outcomes.size !== allocations.length ||
    parsedAllocations.data.some((item) => !outcomes.has(item.itemId))
  )
    throw new AssignmentScoringError();
  const items = parsedAllocations.data.map((item) => {
    const outcome = outcomes.get(item.itemId)!;
    if (outcome.type === 'needs_review')
      return { ...item, status: 'needs_review' as const, earnedPoints: null };
    const earnedHundredths =
      outcome.type === 'full_credit'
        ? item.maxPoints * 100
        : Math.round((item.maxPoints * 100 * outcome.correct) / outcome.total);
    return { ...item, status: 'graded' as const, earnedPoints: earnedHundredths / 100 };
  });
  const maxPoints = items.reduce((sum, item) => sum + item.maxPoints, 0);
  const hundredths = items.reduce(
    (sum, item) => sum + Math.round((item.earnedPoints ?? 0) * 100),
    0,
  );
  const summary = items.some((item) => item.status === 'needs_review')
    ? { status: 'needs_review' as const, maxPoints, earnedPoints: null, percentage: null }
    : {
        status: 'graded' as const,
        maxPoints,
        earnedPoints: hundredths / 100,
        percentage: Math.round((hundredths * 100) / maxPoints) / 100,
      };
  return assignmentScoreSchema.parse({ scoringVersion: 'points_v1', items, summary });
}

/** Convert objective evidence to points without rewriting the retained correctness report. */
export function scoreObjectiveSubmission(
  allocations: AssignmentPointAllocation[],
  input: unknown,
): AssignmentScore {
  const parsed = z
    .union([gradedSubmissionResultSchema, mixedGradedSubmissionResultSchema])
    .safeParse(input);
  if (!parsed.success) throw new AssignmentScoringError();
  const result = parsed.data;
  const counts = { correct: 0, incorrect: 0, unanswered: 0, total: 0 };
  const outcomes = result.items.map((item) => {
    const summary =
      'status' in item.feedback
        ? {
            correct: item.feedback.status === 'correct' ? 1 : 0,
            incorrect: item.feedback.status === 'incorrect' ? 1 : 0,
            unanswered: item.feedback.status === 'unanswered' ? 1 : 0,
            total: 1,
          }
        : item.feedback.summary;
    if (summary.correct + summary.incorrect + summary.unanswered !== summary.total)
      throw new AssignmentScoringError();
    for (const key of summaryKeys) counts[key] += summary[key];
    return {
      itemId: item.itemId,
      outcome: { type: 'correctness' as const, correct: summary.correct, total: summary.total },
    };
  });
  if (summaryKeys.some((key) => counts[key] !== result.summary[key]))
    throw new AssignmentScoringError();
  return scoreAssignment(allocations, outcomes);
}
