/** Student-entered values; missing cells and null are blanks, never false. */
export interface AttemptAnswer {
  rowId: string;
  columnId: string;
  value: boolean | null;
}
export type AttemptAnswers = Record<string, AttemptAnswer[]>;

export interface SubmissionCounts {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
}

/** Frozen evaluation snapshot; future engine changes must not silently recompute official results. */
export interface SubmissionResult {
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
