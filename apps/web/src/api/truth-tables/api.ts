import { requestJson } from '../http-client';
import type { TruthTableCheckRequest } from '@logiclab/contracts';
import { truthTableErrorResponseSchema, truthTableExerciseResponseSchema, truthTableCheckResponseSchema, truthTableSolutionResponseSchema } from '@logiclab/contracts';

export class PracticeApiError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = 'PracticeApiError';
  }
}

function post(route: string, payload: unknown, signal: AbortSignal) {
  return requestJson(`/api/truth-tables/${route}`, {
    body: payload, signal, invalidJson: 'throw',
    error: (_status, body) => {
      const parsed = truthTableErrorResponseSchema.safeParse(body);
      return parsed.success
        ? new PracticeApiError(parsed.data.error.message, parsed.data.error.position)
        : new PracticeApiError('The request could not be completed. Please try again.');
    },
  });
}

function validateResponse<T>(schema: { parse: (body: unknown) => T }, body: unknown): T {
  try { return schema.parse(body); }
  catch { throw new PracticeApiError('The API returned an unexpected response. Please try again.'); }
}

export async function createExercise(formula: string, signal: AbortSignal) {
  return validateResponse(truthTableExerciseResponseSchema, await post('exercise', { formula }, signal));
}
export async function checkAnswers(payload: TruthTableCheckRequest, signal: AbortSignal) {
  return validateResponse(truthTableCheckResponseSchema, await post('check', payload, signal));
}
export async function getSolution(formula: string, signal: AbortSignal) {
  return validateResponse(truthTableSolutionResponseSchema, await post('solution', { formula }, signal));
}
