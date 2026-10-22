import type { SubmissionResult } from '@logiclab/contracts';

/** Completion records intentionally contain no correctness feedback. */
export function submissionFeedback(result: SubmissionResult | null | undefined, itemId: string) {
  return result?.gradingVersion === 'truth_table_v1'
    ? (result.items.find((item) => item.itemId === itemId)?.feedback ?? null)
    : null;
}
