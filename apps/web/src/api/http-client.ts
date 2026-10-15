export type RequestOptions = {
  signal: AbortSignal;
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH';
  invalidJson?: 'throw' | 'null';
  error: (status: number, payload: unknown) => Error;
};

/**
 * Sends abortable JSON requests; callers supply HTTP error mapping and validate successful payloads.
 */
export async function requestJson(
  path: string,
  { signal, body, method, invalidJson = 'null', error }: RequestOptions,
): Promise<unknown> {
  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  // Practice preserves JSON parse failures; account/class APIs use null for malformed JSON.
  const payload: unknown =
    invalidJson === 'throw' ? await response.json() : await response.json().catch(() => null);
  if (!response.ok) throw error(response.status, payload);
  return payload;
}
