import { requestValidatedJson, type ResponseSchema } from './validated-request';
import { accountApiError } from './errors';

type AccountRequestOptions<T> = {
  schema: ResponseSchema<T>;
  signal: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH';
  fallback: string;
  errorOverride?: (status: number, payload: unknown) => Error | undefined;
};

/**
 * Applies shared account/class HTTP error parsing with caller-supplied fallback messages and overrides.
 */
export function requestAccountJson<T>(
  path: string,
  { schema, signal, body, method, fallback, errorOverride }: AccountRequestOptions<T>,
): Promise<T> {
  return requestValidatedJson(path, {
    schema,
    signal,
    body,
    method,
    error: (status, payload) =>
      errorOverride?.(status, payload) ?? accountApiError(status, payload, fallback),
  });
}
