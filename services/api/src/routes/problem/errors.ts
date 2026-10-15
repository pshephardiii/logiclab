import { FormulaParseError } from '@logiclab/logic-engine';
import { mapAuthError } from '../auth/errors';

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
