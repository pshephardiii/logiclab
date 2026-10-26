import { afterEach, expect, test, vi } from 'vitest';
import { work, itemA } from '../../../test/assignment-work-fixture';
import { createResourceRequest } from '../ResourceApiProvider';
import { createApi } from './api';

const copy = { ...work, id: itemA, title: 'Copy of Assigned logic', publishedAt: null, items: [] };
afterEach(() => vi.unstubAllGlobals());

test.each(['normal', 'demo'] as const)(
  'duplicate uses the %s namespace and validates the returned draft',
  async (scope) => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ assignment: copy }) });
    vi.stubGlobal('fetch', fetch);
    const client = createApi(createResourceRequest(scope));
    const signal = new AbortController().signal;
    expect(await client.assignmentAction(work.id, 'duplicate', signal)).toEqual(copy);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${scope === 'demo' ? '/api/demo/resources' : '/api'}/assignments/${work.id}/duplicate`,
      expect.objectContaining({ method: 'POST', body: '{}', credentials: 'same-origin', signal }),
    );
  },
);

test('an invalid success response is rejected without automatically creating another copy', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ assignment: { ...copy, id: 'invalid' } }),
  });
  vi.stubGlobal('fetch', fetch);
  await expect(
    createApi().assignmentAction(work.id, 'duplicate', new AbortController().signal),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
