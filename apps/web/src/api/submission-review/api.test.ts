import { afterEach, expect, test, vi } from 'vitest';
import { createResourceRequest } from '../ResourceApiProvider';
import { createApi } from './api';
import { review, itemA } from '../../../test/assignment-work-fixture';
import { adjustedGrading, gradingHistory } from '../../../test/submission-grading-fixture';

afterEach(() => vi.unstubAllGlobals());

test.each(['normal', 'demo'] as const)(
  '%s grading reads, revisions and history use their explicit resource scope',
  async (scope) => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => adjustedGrading });
    vi.stubGlobal('fetch', fetch);
    const client = createApi(createResourceRequest(scope));
    const path = `${scope === 'demo' ? '/api/demo/resources' : '/api'}/assignments/${review.assignment.id}/submissions/${review.attempt.id}/grading`;
    const signal = new AbortController().signal;
    expect(await client.readGrading(review.assignment.id, review.attempt.id, signal)).toEqual(
      adjustedGrading,
    );
    expect(fetch).toHaveBeenLastCalledWith(
      path,
      expect.objectContaining({ method: 'GET', signal, credentials: 'same-origin' }),
    );
    const input = {
      revision: 0,
      items: [{ itemId: itemA, earnedPoints: 12.25, comment: 'Review the justification.' }],
    };
    await client.saveGrading(review.assignment.id, review.attempt.id, input, signal);
    expect(fetch).toHaveBeenLastCalledWith(
      path,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input), signal }),
    );
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ revisions: [gradingHistory], nextOffset: 20 }),
    });
    expect(
      (await client.readGradingHistory(review.assignment.id, review.attempt.id, 20, signal))
        .nextOffset,
    ).toBe(20);
    expect(fetch).toHaveBeenLastCalledWith(
      path + '/history?offset=20',
      expect.objectContaining({ method: 'GET', signal }),
    );
  },
);

test.each([200, 409])('invalid or conflicting save (%s) rejects without replay', async (status) => {
  const fetch = vi.fn().mockResolvedValue({
    ok: status === 200,
    status,
    json: async () =>
      status === 200
        ? { ...adjustedGrading, grading: { ...adjustedGrading.grading, revision: -1 } }
        : { error: { code: 'SUBMISSION_GRADING_REVISION_CONFLICT', message: 'Reload grading.' } },
  });
  vi.stubGlobal('fetch', fetch);
  await expect(
    createApi().saveGrading(
      review.assignment.id,
      review.attempt.id,
      { revision: 0, items: [] },
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
