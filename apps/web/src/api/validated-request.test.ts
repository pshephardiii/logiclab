import { afterEach, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { requestValidatedJson } from './validated-request';
import { login, loadSession } from './auth/api';
import { createExercise, getSolution, PracticeApiError } from './truth-tables/api';

const schema = z.strictObject({ name: z.string() });
const options = {
  signal: new AbortController().signal,
  schema,
  error: () => new Error('HTTP failure'),
};
afterEach(() => vi.unstubAllGlobals());
function respond(body: string, status = 200) {
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => new Response(body, { status })),
  );
}

test('validates successful responses and preserves request body and signal', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"name":"Logic"}'));
  vi.stubGlobal('fetch', fetch);
  const response = await requestValidatedJson('/api/example', {
    ...options,
    body: { name: 'Logic' },
  });
  expect(response.name).toBe('Logic');
  expect(fetch).toHaveBeenCalledWith(
    '/api/example',
    expect.objectContaining({
      method: 'POST',
      body: '{"name":"Logic"}',
      signal: options.signal,
      credentials: 'same-origin',
    }),
  );
});

test('schema failures propagate unless a validation mapper is supplied', async () => {
  respond('{}');
  await expect(requestValidatedJson('/api/example', options)).rejects.toBeInstanceOf(z.ZodError);
  const mapped = new Error('Invalid response');
  await expect(
    requestValidatedJson('/api/example', { ...options, validationError: () => mapped }),
  ).rejects.toBe(mapped);
});

test('HTTP and network failures bypass schema error mapping', async () => {
  const mapper = vi.fn(() => new Error('Schema failure'));
  respond('{}', 503);
  await expect(
    requestValidatedJson('/api/example', { ...options, validationError: mapper }),
  ).rejects.toThrow('HTTP failure');
  const aborted = new DOMException('Canceled', 'AbortError');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted));
  await expect(
    requestValidatedJson('/api/example', { ...options, validationError: mapper }),
  ).rejects.toBe(aborted);
  expect(mapper).not.toHaveBeenCalled();
});

test('malformed JSON follows the selected decoding policy', async () => {
  respond('invalid');
  await expect(requestValidatedJson('/api/example', options)).rejects.toBeInstanceOf(z.ZodError);
  await expect(
    requestValidatedJson('/api/example', { ...options, invalidJson: 'throw' }),
  ).rejects.toBeInstanceOf(SyntaxError);
});

test('account 401 means signed out and 404 keeps its service-unavailable message', async () => {
  respond('{}', 401);
  await expect(loadSession(options.signal)).resolves.toBeNull();
  respond('missing', 404);
  await expect(login({}, options.signal)).rejects.toMatchObject({
    status: 404,
    message: 'Account access is currently unavailable. You can still practice.',
  });
});

test('practice preserves formula positions and remaps only invalid successful responses', async () => {
  respond(
    JSON.stringify({ error: { code: 'INVALID_FORMULA', message: 'Bad formula.', position: 2 } }),
    400,
  );
  await expect(createExercise('?', options.signal)).rejects.toMatchObject({
    position: 2,
    message: 'Bad formula.',
  });
  respond('{}');
  await expect(getSolution('P', options.signal)).rejects.toEqual(
    new PracticeApiError('The API returned an unexpected response. Please try again.'),
  );
});

test('explicit PATCH requests retain JSON encoding, credentials, and validation', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"name":"Logic"}'));
  vi.stubGlobal('fetch', fetch);
  await requestValidatedJson('/api/example', {
    ...options,
    method: 'PATCH',
    body: { name: 'Logic' },
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/example',
    expect.objectContaining({
      method: 'PATCH',
      credentials: 'same-origin',
      body: '{"name":"Logic"}',
      signal: options.signal,
    }),
  );
});
