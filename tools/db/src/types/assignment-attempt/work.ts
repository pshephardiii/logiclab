import type {
  ConceptualResponse,
  MixedGradedSubmissionResult,
  MixedCompletionSubmissionResult,
} from './mixed-work.ts';

/** Student-entered values; missing cells and null are blanks, never false. */
export interface AttemptAnswer {
  rowId: string;
  columnId: string;
  value: boolean | null;
}
export type AttemptAnswers = Record<string, AttemptAnswer[] | ConceptualResponse>;

export interface SubmissionCounts {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
}

/** Frozen evaluation snapshot; future engine changes must not silently recompute official results. */
export interface GradedSubmissionResult {
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
export interface CompletionSubmissionResult {
  gradingVersion: 'completion_v1';
  items: { itemId: string; completedCells: number; totalCells: number }[];
  summary: { completedCells: number; totalCells: number };
}
export type SubmissionResult =
  | GradedSubmissionResult
  | CompletionSubmissionResult
  | MixedGradedSubmissionResult
  | MixedCompletionSubmissionResult;
