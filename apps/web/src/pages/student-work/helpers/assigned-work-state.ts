import type { ConceptualAnswer } from '@logiclab/contracts';
import type { SavedDerivationAnswer as DerivationAnswer } from '@logiclab/contracts/saved-student-work';
import type {
  SavedStudentAssignment as StudentAssignment,
  SavedStudentAttempt as StudentAttempt,
} from '@logiclab/contracts/saved-student-work';
import {
  isFinishedFitchProofAttempt,
  isFinishedDependencyProofAttempt,
  isFinishedTreeProofAttempt,
} from '@logiclab/logic-engine/proof/completion';
import type { Answers } from '../../../features/truthTable/types';
import { submittedAnswers } from '../../../features/truthTable/helpers/submitted-answers';
import { conceptualAnswerFilled } from '../../../features/assignment/helpers/conceptual-answers';

/** Display/request eligibility only; the server remains authoritative for every operation. */
export function assignedWorkCapabilities(
  assignment: StudentAssignment | null,
  attempt: StudentAttempt | null,
) {
  const hasFinalSubmission =
    assignment !== null && assignment.assessmentMode !== 'ungraded_practice';

  const requiresCompleteAnswers = assignment?.assessmentMode === 'completion_only';
  const allowsImmediateFeedback = assignment?.feedbackTiming === 'immediate';
  const allowsExplicitCheck = assignment?.feedbackTiming === 'on_check' || allowsImmediateFeedback;

  const solutionAvailable =
    assignment?.solutionAccess === 'anytime' ||
    (assignment?.solutionAccess === 'instructor_release' &&
      Boolean(assignment.answersRevealedAt)) ||
    (assignment?.solutionAccess === 'after_submission' && Boolean(attempt?.submittedAt));

  return {
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
  }: {
    answers: Record<string, Answers>;
    choiceAnswers: Record<string, ConceptualAnswer>;
    proofAnswers: Record<string, DerivationAnswer>;
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
          : item.content.type === 'derivation'
            ? (item.content.format === 'tree'
                ? isFinishedTreeProofAttempt
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
