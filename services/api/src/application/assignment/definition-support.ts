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
