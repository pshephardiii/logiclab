import { AssessmentMode, FeedbackTiming } from '@logiclab/contracts/assignment-policy-values';
import { ProblemType } from '@logiclab/contracts/problem-type';
import { assertProofFormatAvailable } from '../proof/availability';
import { libraryProblemDefinition } from '../problem/library-definition';
import { AssignmentOperationError } from './errors';
import { hasFinishedTruthTreeReference } from '../problem/truth-tree/authoring';

/** Proofs in final-submission modes expose diagnostics only under result-release policy. */
export function supportedAssignmentDefinition(
  input: unknown,
  policy: { assessmentMode: string; feedbackTiming: string },
) {
  const definition = libraryProblemDefinition(input);

  if (
    (definition.type === ProblemType.Derivation || definition.type === ProblemType.TruthTree) &&
    policy.assessmentMode !== AssessmentMode.UngradedPractice &&
    !(
      [AssessmentMode.Graded, AssessmentMode.CompletionOnly].some(
        (candidate) => candidate === policy.assessmentMode,
      ) && policy.feedbackTiming === FeedbackTiming.OnSubmission
    )
  )
    throw new AssignmentOperationError('proof_mode_unavailable');

  return definition;
}

/** New assignment composition/publication must not reuse unavailable historical formats. */
export function assignmentAdmissionDefinition(
  input: unknown,
  policy: { assessmentMode: string; feedbackTiming: string },
) {
  const definition = supportedAssignmentDefinition(input, policy);

  if (definition.type === ProblemType.Derivation) assertProofFormatAvailable(definition.format);

  if (
    definition.type === ProblemType.TruthTree &&
    policy.assessmentMode === AssessmentMode.CompletionOnly &&
    !hasFinishedTruthTreeReference(definition)
  )
    throw new AssignmentOperationError('truth_tree_reference_incomplete');

  return definition;
}
