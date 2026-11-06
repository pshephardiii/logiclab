import type { SavedDerivationAnswer as DerivationAnswer } from '@logiclab/contracts/saved-student-work';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

/** An explicit empty response stays distinct from never starting a proof. */
export function blankDerivationAnswer(
  format: DerivationAnswer['proof']['format'] = 'fitch',
): DerivationAnswer {
  if (format === 'tree')
    return { type: 'derivation', proof: { proofVersion: 1, format, rootId: null, nodes: [] } };

  if (format === 'dependency')
    return { type: 'derivation', proof: { proofVersion: 1, format, steps: [] } };

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
