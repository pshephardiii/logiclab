import { assertProofFormatAvailable } from '../proof/availability';
import { libraryProblemDefinition } from '../problem/library-definition';
import { AssignmentOperationError } from './errors';

/** Proofs in final-submission modes expose diagnostics only under result-release policy. */
export function supportedAssignmentDefinition(
  input: unknown,
  policy: { assessmentMode: string; feedbackTiming: string },
) {
  const definition = libraryProblemDefinition(input);

  if (
    definition.type === 'derivation' &&
    policy.assessmentMode !== 'ungraded_practice' &&
    !(
      ['graded', 'completion_only'].includes(policy.assessmentMode) &&
      policy.feedbackTiming === 'on_submission'
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
  if (definition.type === 'derivation') assertProofFormatAvailable(definition.format);
  return definition;
}
