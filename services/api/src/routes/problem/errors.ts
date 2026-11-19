import {
  DerivationAuthoringError,
  DerivationPublicationError,
} from '../../application/problem/derivation/errors';
import { mapProblemDefinitionError } from '../problem-definition-error';
import { FormulaParseError } from '@logiclab/logic-engine';
import { mapAuthError } from '../auth/errors';
import {
  TruthTreeAuthoringError,
  TruthTreePublicationError,
} from '../../application/problem/truth-tree/errors';

export class ProblemError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function mapProblemError(error: unknown) {
  if (error instanceof TruthTreePublicationError)
    return {
      status: 409,
      code:
        error.code === 'missing_reference'
          ? 'TRUTH_TREE_REFERENCE_REQUIRED'
          : 'TRUTH_TREE_REFERENCE_NOT_VERIFIED',
      message: 'Save a verified reference tree before publishing this problem.',
    };

  if (error instanceof TruthTreeAuthoringError)
    return {
      status: error.code === 'reference_unavailable' ? 409 : 400,
      code:
        error.code === 'reference_unavailable'
          ? 'TRUTH_TREE_REFERENCE_UNAVAILABLE'
          : 'TRUTH_TREE_DEFINITION_INVALID',
      message: 'Check the truth-tree statement and saved reference.',
    };
  if (error instanceof DerivationPublicationError)
    return {
      status: 409,
      code:
        error.code === 'missing_reference'
          ? 'DERIVATION_REFERENCE_REQUIRED'
          : 'DERIVATION_REFERENCE_NOT_ACCEPTED',
      message:
        error.code === 'missing_reference'
          ? 'Add a reference proof before publishing this derivation.'
          : 'Check and correct the saved reference proof before publishing this derivation.',
    };

  if (error instanceof DerivationAuthoringError)
    return {
      status: error.code === 'reference_unavailable' ? 409 : 400,
      code:
        error.code === 'unknown_rule'
          ? 'DERIVATION_RULE_UNSUPPORTED'
          : error.code === 'reference_unavailable'
            ? 'DERIVATION_REFERENCE_UNAVAILABLE'
            : 'DERIVATION_DEFINITION_INVALID',
      message:
        error.code === 'unknown_rule'
          ? 'Choose supported rule identities.'
          : error.code === 'reference_unavailable'
            ? 'An accepted reference proof is required.'
            : 'Check the derivation configuration and rule labels.',
    };

  const unsupported = mapProblemDefinitionError(error);

  if (unsupported) return unsupported;

  if (error instanceof ProblemError)
    return { status: error.status, code: error.code, message: error.message };

  if (error instanceof FormulaParseError)
    return { status: 400, code: error.code, message: error.message, position: error.position };

  const mapped = mapAuthError(error);

  if (mapped.status !== 503) return mapped;

  return {
    status: 503,
    code: 'PROBLEM_UNAVAILABLE',
    message: 'Problems are temporarily unavailable. Please try again.',
  };
}
