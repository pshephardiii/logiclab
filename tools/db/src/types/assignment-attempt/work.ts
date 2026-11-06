import type { ProofSubmissionResult, ProofCompletionSubmissionResult } from './proof-result.ts';
import type { FitchDerivationAnswer } from './derivation-work.ts';
import type { DependencyDerivationAnswer } from './dependency-derivation-work.ts';
import type { TreeDerivationAnswer } from './tree-derivation-work.ts';
import type {
  ConceptualResponse,
  ObjectiveGradedSubmissionResult,
  ObjectiveCompletionSubmissionResult,
} from './mixed-work.ts';

/** Student-entered values; missing cells and null are blanks, never false. */
export interface TruthTableAttemptAnswer {
  rowId: string;
  columnId: string;
  value: boolean | null;
}
export type AttemptAnswers = Record<
  string,
  | TruthTableAttemptAnswer[]
  | ConceptualResponse
  | FitchDerivationAnswer
  | DependencyDerivationAnswer
  | TreeDerivationAnswer
>;

export interface SubmissionCounts {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
}

/** Frozen evaluation snapshot; future engine changes must not silently recompute official results. */
export interface TruthTableGradedSubmissionResult {
  gradingVersion: 'truth_table_v1';
  items: {
    itemId: string;
    feedback: {
      cells: { rowId: string; columnId: string; status: 'correct' | 'incorrect' | 'unanswered' }[];
      summary: SubmissionCounts;
    };
  }[];
  summary: SubmissionCounts;
}

/** Completion-only finalization stores no correctness counts or grading feedback. */
export interface TruthTableCompletionSubmissionResult {
  gradingVersion: 'completion_v1';
  items: { itemId: string; completedCells: number; totalCells: number }[];
  summary: { completedCells: number; totalCells: number };
}
export type SubmissionResult =
  | TruthTableGradedSubmissionResult
  | TruthTableCompletionSubmissionResult
  | ObjectiveGradedSubmissionResult
  | ObjectiveCompletionSubmissionResult
  | ProofSubmissionResult
  | ProofCompletionSubmissionResult;
