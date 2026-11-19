import type {
  TruthTableAnswer as TruthTableAttemptAnswer,
  TruthTableGradedSubmissionResult,
  TruthTableCompletionSubmissionResult,
} from '@logiclab/contracts';
import type { ProofSubmissionResult, ProofCompletionSubmissionResult } from './proof-result.ts';
import type { FitchDerivationAnswer } from './derivation-work.ts';
import type { DependencyDerivationAnswer } from './dependency-derivation-work.ts';
import type { NaturalDeductionTreeDerivationAnswer } from './natural-deduction-tree-derivation-work.ts';
import type { TruthTreeAnswer } from './truth-tree-work.ts';
import type {
  ConceptualResponse,
  ObjectiveGradedSubmissionResult,
  ObjectiveCompletionSubmissionResult,
} from './mixed-work.ts';

/** Student-entered values; missing cells and null are blanks, never false. */
export type {
  TruthTableAnswer as TruthTableAttemptAnswer,
  SubmissionCounts,
  TruthTableGradedSubmissionResult,
  TruthTableCompletionSubmissionResult,
} from '@logiclab/contracts';

export type AttemptAnswers = Record<
  string,
  | TruthTableAttemptAnswer[]
  | ConceptualResponse
  | FitchDerivationAnswer
  | DependencyDerivationAnswer
  | NaturalDeductionTreeDerivationAnswer
  | TruthTreeAnswer
>;

export type SubmissionResult =
  | TruthTableGradedSubmissionResult
  | TruthTableCompletionSubmissionResult
  | ObjectiveGradedSubmissionResult
  | ObjectiveCompletionSubmissionResult
  | ProofSubmissionResult
  | ProofCompletionSubmissionResult;
