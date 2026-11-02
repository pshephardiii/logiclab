import type { DerivationAnswer } from '@logiclab/contracts/derivation-work';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

/** An explicit empty response stays distinct from never starting a proof. */
export function blankDerivationAnswer(): DerivationAnswer {
  return { type: 'derivation', proof: { proofVersion: 1, format: 'fitch', steps: [], blocks: [] } };
}
export function savedProofAnswers(
  assignment: SavedStudentAssignment,
  attempt: SavedStudentAttempt | null,
) {
  const answers: Record<string, DerivationAnswer> = {};
  for (const item of assignment.items) {
    if (!('content' in item) || item.content.type !== 'derivation') continue;
    const answer = attempt?.answers[item.id];
    if (answer && !Array.isArray(answer) && answer.type === 'derivation') answers[item.id] = answer;
  }
  return answers;
}
/** Compare the stored structure and identities, without checking, repairing or canonicalizing formulas. */
export function sameProofAnswer(left: DerivationAnswer, right?: DerivationAnswer): boolean {
  return left === right || (right !== undefined && JSON.stringify(left) === JSON.stringify(right));
}
