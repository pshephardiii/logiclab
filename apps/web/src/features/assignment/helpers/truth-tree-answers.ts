import type { TruthTreeAnswer } from '@logiclab/contracts/truth-tree-work';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

export function blankTruthTreeAnswer(): TruthTreeAnswer {
  return {
    type: 'truth_tree',
    tree: {
      treeVersion: 1,
      format: 'truth_tree',
      rootBranchId: null,
      occurrences: [],
      branches: [],
      expansions: [],
    },
  };
}

export function savedTruthTreeAnswers(
  assignment: SavedStudentAssignment,
  attempt: SavedStudentAttempt | null,
): Record<string, TruthTreeAnswer> {
  const answers: Record<string, TruthTreeAnswer> = {};
  for (const item of assignment.items) {
    if (!('content' in item) || item.content.type !== 'truth_tree') continue;

    const answer = attempt?.answers[item.id];
    if (answer && !Array.isArray(answer) && answer.type === 'truth_tree') answers[item.id] = answer;
  }
  return answers;
}

/** Compare raw saved structures, including occurrence identities and unfinished formulas. */
export function sameTruthTreeAnswer(left: TruthTreeAnswer, right?: TruthTreeAnswer): boolean {
  return left === right || (right !== undefined && JSON.stringify(left) === JSON.stringify(right));
}
