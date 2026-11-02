import { libraryProblemDefinition } from '../problem/library-definition';
import { AssignmentOperationError } from './errors';

/** Assignment admission is narrower than private library authoring until grading/review is ready. */
export function supportedAssignmentDefinition(
  input: unknown,
  policy: { assessmentMode: string; feedbackTiming: string },
) {
  const definition = libraryProblemDefinition(input);
  if (
    definition.type === 'derivation' &&
    policy.assessmentMode !== 'ungraded_practice' &&
    !(policy.assessmentMode === 'completion_only' && policy.feedbackTiming === 'on_submission')
  )
    throw new AssignmentOperationError('proof_mode_unavailable');
  return definition;
}
