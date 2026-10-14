import { requestValidatedJson, type ResponseSchema } from '../validated-request';
import type { TruthTableCheckRequest } from '@logiclab/contracts';
import { truthTableErrorResponseSchema, truthTableExerciseResponseSchema, truthTableCheckResponseSchema, truthTableSolutionResponseSchema } from '@logiclab/contracts';

export class PracticeApiError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = 'PracticeApiError';
  }
}

function post<T>(route: string, payload: unknown, signal: AbortSignal, schema: ResponseSchema<T>) {
  return requestValidatedJson(`/api/truth-tables/${route}`, {
    schema,
    validationError: () => new PracticeApiError('The API returned an unexpected response. Please try again.'),
    body: payload, signal, invalidJson: 'throw',
    error: (_status, body) => {
      const parsed = truthTableErrorResponseSchema.safeParse(body);
      return parsed.success
        ? new PracticeApiError(parsed.data.error.message, parsed.data.error.position)
        : new PracticeApiError('The request could not be completed. Please try again.');
    },
  });
}

export async function createExercise(formula: string, signal: AbortSignal) {
  return post('exercise', { formula }, signal, truthTableExerciseResponseSchema);
}
export async function checkAnswers(payload: TruthTableCheckRequest, signal: AbortSignal) {
  return post('check', payload, signal, truthTableCheckResponseSchema);
}
export async function getSolution(formula: string, signal: AbortSignal) {
  return post('solution', { formula }, signal, truthTableSolutionResponseSchema);
}
