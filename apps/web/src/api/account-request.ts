import { requestJson } from './http-client';
import { accountApiError } from './errors';

type AccountRequestOptions = {
  signal: AbortSignal;
  body?: unknown;
  fallback: string;
  errorOverride?: (status: number, payload: unknown) => Error | undefined;
};

/**
 * Applies shared account/class HTTP error parsing with caller-supplied fallback messages and overrides.
 */
export function requestAccountJson(path: string, {
  signal, body, fallback, errorOverride,
}: AccountRequestOptions): Promise<unknown> {
  return requestJson(path, {
    signal, body,
    error: (status, payload) => errorOverride?.(status, payload)
      ?? accountApiError(status, payload, fallback),
  });
}
