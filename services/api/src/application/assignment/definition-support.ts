import { libraryProblemDefinition } from '../problem/library-definition';
import { AssignmentOperationError } from './errors';

/** Assignment admission is narrower than private library authoring until grading/review is ready. */
export function supportedAssignmentDefinition(input: unknown, assessmentMode: string) {
  const definition = libraryProblemDefinition(input);
  if (definition.type === 'derivation' && assessmentMode !== 'ungraded_practice')
    throw new AssignmentOperationError('proof_mode_unavailable');
  return definition;
}
