import {
  AssessmentMode,
  FeedbackTiming,
  SolutionAccess,
} from '@logiclab/contracts/assignment-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import type { TruthTreeAnswer } from '@logiclab/contracts/truth-tree-work';
import { isFinishedTruthTreeAttempt } from '@logiclab/logic-engine/truth-tree';
import { isProofFormatAvailable } from '@logiclab/contracts';
import type { ConceptualAnswer } from '@logiclab/contracts';
import type { SavedDerivationAnswer as DerivationAnswer } from '@logiclab/contracts/saved-student-work';
import type {
  SavedStudentAssignment as StudentAssignment,
  SavedStudentAttempt as StudentAttempt,
} from '@logiclab/contracts/saved-student-work';
import {
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
  isFinishedNaturalDeductionTreeProofAttempt,
} from '@logiclab/logic-engine/proof/completion';
import type { Answers } from '../../../features/truthTable/types';
import { submittedAnswers } from '../../../features/truthTable/helpers/submitted-answers';
import { conceptualAnswerFilled } from '../../../features/assignment/helpers/conceptual-answers';

/** Display/request eligibility only; the server remains authoritative for every operation. */
export function assignedWorkCapabilities(
  assignment: StudentAssignment | null,
  attempt: StudentAttempt | null,
) {
  const workUnavailable = Boolean(
    assignment?.items.some(
      (item) =>
        'content' in item &&
        item.content.type === ProblemType.Derivation &&
        !isProofFormatAvailable(item.content.format),
    ),
  );
  const hasFinalSubmission =
    assignment !== null && assignment.assessmentMode !== AssessmentMode.UngradedPractice;

  const requiresCompleteAnswers = assignment?.assessmentMode === AssessmentMode.CompletionOnly;
  const allowsImmediateFeedback =
    !workUnavailable && assignment?.feedbackTiming === FeedbackTiming.Immediate;
  const allowsExplicitCheck =
    !workUnavailable &&
    (assignment?.feedbackTiming === FeedbackTiming.OnCheck || allowsImmediateFeedback);

  const solutionAvailable =
    assignment?.solutionAccess === SolutionAccess.Anytime ||
    (assignment?.solutionAccess === SolutionAccess.InstructorRelease &&
      Boolean(assignment.answersRevealedAt)) ||
    (assignment?.solutionAccess === SolutionAccess.AfterSubmission &&
      Boolean(attempt?.submittedAt));

  return {
    workUnavailable,
    hasFinalSubmission,
    requiresCompleteAnswers,
    allowsImmediateFeedback,
    allowsExplicitCheck,
    solutionAvailable,
  };
}

/**
 * Finished response shape is separate from correctness and whether edits have been saved.
 */
export function assignmentCompletionReady(
  assignment: StudentAssignment | null,
  {
    answers,
    choiceAnswers,
    proofAnswers,
    truthTreeAnswers = {},
  }: {
    answers: Record<string, Answers>;
    choiceAnswers: Record<string, ConceptualAnswer>;
    proofAnswers: Record<string, DerivationAnswer>;
    truthTreeAnswers?: Record<string, TruthTreeAnswer>;
  },
) {
  return (
    Boolean(assignment?.items.length) &&
    Boolean(
      assignment?.items.every((item) =>
        'exercise' in item
          ? submittedAnswers(item.exercise, answers[item.id] ?? {}).every(
              (answer) => answer.value !== null,
            )
          : item.content.type === ProblemType.TruthTree
            ? isFinishedTruthTreeAttempt({
                problem: {
                  ruleCatalogVersion: item.content.ruleCatalogVersion,
                  premises: item.content.premises,
                  conclusion: item.content.conclusion,
                },
                tree: truthTreeAnswers[item.id]?.tree,
              })
            : item.content.type === ProblemType.Derivation
              ? (item.content.format === 'tree'
                  ? isFinishedNaturalDeductionTreeProofAttempt
                  : item.content.format === 'dependency'
                    ? isFinishedDependencyProofAttempt
                    : isFinishedFitchProofAttempt)({
                  problem: {
                    ruleCatalogVersion: item.content.ruleCatalogVersion,
                    premises: item.content.premises,
                    conclusion: item.content.conclusion,
                    permittedRuleIds: item.content.rules.map((rule) => rule.id),
                  },
                  proof: proofAnswers[item.id]?.proof,
                })
              : conceptualAnswerFilled(choiceAnswers[item.id]),
      ),
    )
  );
}
