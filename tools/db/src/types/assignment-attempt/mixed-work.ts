import type { AttemptAnswers } from './work.ts';

export type {
  ConceptualAnswer as ConceptualResponse,
  ObjectiveGradedItem,
  ObjectiveGradedSubmissionResult,
  ObjectiveCompletionSubmissionResult,
} from '@logiclab/contracts';

/** The persisted answer map also includes proof/tree responses. */
export type AssignmentResponses = AttemptAnswers;
