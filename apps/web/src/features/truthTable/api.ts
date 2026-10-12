import { truthTableErrorResponseSchema, truthTableExerciseResponseSchema } from '@logiclab/schema';

export class PracticeApiError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = 'PracticeApiError';
  }
}

export async function createExercise(formula: string, signal: AbortSignal) {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/truth-tables/exercise`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formula }), signal,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = truthTableErrorResponseSchema.safeParse(body);
    throw parsed.success
      ? new PracticeApiError(parsed.data.error.message, parsed.data.error.position)
      : new PracticeApiError('The exercise could not be created. Please try again.');
  }
  const parsed = truthTableExerciseResponseSchema.safeParse(body);
  if (!parsed.success) throw new PracticeApiError('The API returned an unexpected exercise. Please try again.');
  return parsed.data;
}
