import type { SubmissionResult as ObjectiveResult } from '@logiclab/contracts';
import type {
  ProofSubmissionResult,
  ProofCompletionSubmissionResult,
} from '@logiclab/contracts/proof-submission';

type SubmissionResult = ObjectiveResult | ProofSubmissionResult | ProofCompletionSubmissionResult;

/** Completion records intentionally contain no correctness feedback. */
export function truthTableSubmissionFeedback(
  result: SubmissionResult | null | undefined,
  itemId: string,
) {
  if (result?.gradingVersion === 'mixed_v1' || result?.gradingVersion === 'proof_mixed_v1') {
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
  if (result?.gradingVersion !== 'mixed_v1' && result?.gradingVersion !== 'proof_mixed_v1')
    return null;

  const item = result.items.find((item) => item.itemId === itemId);

  return item && item.type !== 'truth_table' && item.type !== 'derivation' ? item.feedback : null;
}

/** Caller supplies only the already-authorized student result projection. */
export function proofSubmissionFeedback(
  result: SubmissionResult | null | undefined,
  itemId: string,
) {
  if (
    result?.gradingVersion !== 'proof_mixed_v1' &&
    result?.gradingVersion !== 'proof_completion_v1'
  )
    return null;

  const item = result.items.find((item) => item.itemId === itemId);

  return item?.type === 'derivation' ? item.report : null;
}
