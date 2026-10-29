import { UnsupportedProblemDefinitionError } from '../application/problem/definition-support';

/** Shared response for a staged/unsupported definition; never expose its authored key. */
export function mapProblemDefinitionError(error: unknown) {
  if (!(error instanceof UnsupportedProblemDefinitionError)) return undefined;
  return {
    status: 409,
    code: 'PROBLEM_DEFINITION_UNSUPPORTED',
    message: 'This problem definition is not supported by this workflow yet.',
  };
}
