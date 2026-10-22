import { afterEach, expect, test, vi } from 'vitest';
import { createApi } from './api';
import { createResourceRequest } from '../ResourceApiProvider';
import { work, itemA } from '../../../test/assignment-work-fixture';

afterEach(() => vi.unstubAllGlobals());

test.each(['normal', 'demo'] as const)(
  'explicit checks use the %s resource client and validate feedback responses',
  async (scope) => {
    const feedback = { cells: [], summary: { correct: 0, incorrect: 0, unanswered: 0, total: 0 } };
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ itemId: itemA, feedback }) });
    vi.stubGlobal('fetch', fetch);
    const client = createApi(createResourceRequest(scope));
    const signal = new AbortController().signal;
    const body = { itemId: itemA, answers: [] };
    await expect(client.checkAssignedAnswers(work.id, body, signal)).resolves.toEqual({
      itemId: itemA,
      feedback,
    });
    expect(fetch).toHaveBeenCalledWith(
      `/api/${scope === 'demo' ? 'demo/resources/' : ''}student/assignments/${work.id}/check`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body), signal }),
    );
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ itemId: itemA, feedback: null }),
    });
    await expect(client.checkAssignedAnswers(work.id, body, signal)).rejects.toThrow();
  },
);
