import type { SubmissionResult } from '@logiclab/contracts';

/** Completion records intentionally contain no correctness feedback. */
export function submissionFeedback(result: SubmissionResult | null | undefined, itemId: string) {
  if (result?.gradingVersion === 'mixed_v1') {
    const item = result.items.find((item) => item.itemId === itemId);
    return item?.type === 'truth_table' ? item.feedback : null;
  }
  return result?.gradingVersion === 'truth_table_v1'
    ? (result.items.find((item) => item.itemId === itemId)?.feedback ?? null)
    : null;
}

/** Conceptual status is distinct from table feedback; completion has no correctness at all. */
export function conceptualSubmissionFeedback(
  result: SubmissionResult | null | undefined,
  itemId: string,
) {
  if (result?.gradingVersion !== 'mixed_v1') return null;
  const item = result.items.find((item) => item.itemId === itemId);
  return item && item.type !== 'truth_table' ? item.feedback : null;
}
