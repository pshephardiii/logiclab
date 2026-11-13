import { ProofMethodUnavailableError } from '../application/proof/availability';
import { UnsupportedProblemDefinitionError } from '../application/problem/definition-support';

/** Shared admission/definition errors; never expose authored keys or private proof data. */
export function mapProblemDefinitionError(error: unknown) {
  if (error instanceof ProofMethodUnavailableError)
    return {
      status: 409,
      code: 'PROOF_METHOD_UNAVAILABLE',
      message: 'This proof method is unavailable for new work.',
    };

  if (!(error instanceof UnsupportedProblemDefinitionError)) return undefined;

  return {
    status: 409,
    code: 'PROBLEM_DEFINITION_UNSUPPORTED',
    message: 'This problem definition is not supported by this workflow yet.',
  };
}
