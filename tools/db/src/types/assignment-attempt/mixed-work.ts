import type { AttemptAnswer, GradedSubmissionResult, SubmissionCounts } from './work.ts';

export type ConceptualResponse =
  | { type: 'true_false'; answer: boolean | null }
  | { type: 'multiple_choice'; optionId: string | null };

/** Mixed JSON response shapes, keyed by pinned assignment occurrence. */
export type AssignmentResponses = Record<string, AttemptAnswer[] | ConceptualResponse>;
export type MixedGradedItem =
  | {
      type: 'truth_table';
      itemId: string;
      feedback: GradedSubmissionResult['items'][number]['feedback'];
    }
  | {
      type: 'true_false';
      itemId: string;
      feedback: { status: 'correct' | 'incorrect' | 'unanswered' };
    }
  | {
      type: 'multiple_choice';
      itemId: string;
      feedback: { status: 'correct' | 'incorrect' | 'unanswered' };
    };
export interface MixedGradedSubmissionResult {
  gradingVersion: 'mixed_v1';
  items: MixedGradedItem[];
  summary: SubmissionCounts;
}
export interface MixedCompletionSubmissionResult {
  gradingVersion: 'mixed_completion_v1';
  items: {
    itemId: string;
    type: 'truth_table' | 'true_false' | 'multiple_choice';
    completedResponses: number;
    totalResponses: number;
  }[];
  summary: { completedResponses: number; totalResponses: number };
}
