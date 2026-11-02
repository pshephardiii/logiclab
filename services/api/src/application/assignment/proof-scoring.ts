import {
  assignmentScoreSchema,
  type AssignmentPointAllocation,
  type AssignmentScore,
} from '@logiclab/contracts';
import { proofSubmissionResultSchema } from '@logiclab/contracts/proof-submission';
import {
  scoreAssignment,
  objectiveScoringOutcomes,
  type AssignmentScoringOutcome,
  AssignmentScoringError,
} from './scoring';

/**
 * Caller supplies fresh server-computed evidence, never a client-provided result.
 * Accepted proofs get full allocation; other outcomes stay nonnumeric pending review.
 */
export function scoreProofSubmission(
  allocations: AssignmentPointAllocation[],
  input: unknown,
): AssignmentScore {
  const parsed = proofSubmissionResultSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentScoringError();
  const result = parsed.data;
  const objective = result.items.flatMap((item) => (item.type === 'derivation' ? [] : [item]));
  const outcomes: AssignmentScoringOutcome[] = objectiveScoringOutcomes({
    gradingVersion: 'mixed_v1',
    items: objective,
    summary: result.summary.objective,
  });
  for (const item of result.items) {
    if (item.type === 'derivation')
      outcomes.push({
        itemId: item.itemId,
        outcome: { type: item.report.status === 'accepted' ? 'full_credit' : 'needs_review' },
      });
  }
  return scoreAssignment(allocations, outcomes);
}

/** Validate retained arithmetic/review state only; never rerun the proof engine or replace evidence. */
export function validateProofSubmissionScore(result: unknown, input: unknown): AssignmentScore {
  const parsed = assignmentScoreSchema.safeParse(input);
  if (!parsed.success) throw new AssignmentScoringError();
  const expected = scoreProofSubmission(
    parsed.data.items.map(({ itemId, maxPoints }) => ({ itemId, maxPoints })),
    result,
  );
  if (JSON.stringify(expected) !== JSON.stringify(parsed.data)) throw new AssignmentScoringError();
  return parsed.data;
}
