import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTreeAnswer } from '@logiclab/contracts/truth-tree-work';
import type {
  SavedStudentAssignment,
  SavedStudentAttempt,
} from '@logiclab/contracts/saved-student-work';

export function blankTruthTreeAnswer(): TruthTreeAnswer {
  return {
    type: ProblemType.TruthTree,
    verdict: null,
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
    if (!('content' in item) || item.content.type !== ProblemType.TruthTree) continue;

    const answer = attempt?.answers[item.id];
    if (answer && !Array.isArray(answer) && answer.type === ProblemType.TruthTree)
      answers[item.id] = answer;
  }
  return answers;
}

/** Compare raw saved structures, including occurrence identities and unfinished formulas. */
export function sameTruthTreeAnswer(left: TruthTreeAnswer, right?: TruthTreeAnswer): boolean {
  return (
    left === right ||
    (right !== undefined &&
      JSON.stringify({ tree: left.tree, verdict: left.verdict ?? null }) ===
        JSON.stringify({ tree: right.tree, verdict: right.verdict ?? null }))
  );
}
