import { afterEach, expect, test, vi } from 'vitest';
import { createResourceRequest } from '../ResourceApiProvider';
import { createApi } from './api';

const input = {
  title: 'Conjunction',
  instructions: null,
  definition: { type: 'truth_table' as const, definitionVersion: 1 as const, formula: 'P &' },
};
afterEach(() => vi.unstubAllGlobals());

test.each(['normal', 'demo'] as const)(
  'preserves positioned formula errors for %s library saves',
  async (scope) => {
    const message = 'Expected a variable, negation, or grouped expression (at character 4).';
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'EXPECTED_EXPRESSION', message, position: 3 } }),
    });
    vi.stubGlobal('fetch', fetch);
    await expect(
      createApi(createResourceRequest(scope)).saveProblem(input, new AbortController().signal),
    ).rejects.toMatchObject({ message, status: 400 });
    expect(fetch).toHaveBeenCalledWith(
      `${scope === 'demo' ? '/api/demo/resources' : '/api'}/problems`,
      expect.objectContaining({ method: 'POST' }),
    );
  },
);

test('uses a safe fallback when a library error payload is malformed', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({ unexpected: 'payload' }) }),
  );
  await expect(createApi().saveProblem(input, new AbortController().signal)).rejects.toThrow(
    'Could not update or load your library. Please try again.',
  );
});

test.each(['normal', 'demo'] as const)(
  'reads private derivation drafts and checks the saved reference in %s scope',
  async (scope) => {
    const { derivationDraft } = await import('../../../test/derivation');
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ problems: [derivationDraft], nextOffset: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          problemId: derivationDraft.id,
          updatedAt: derivationDraft.updatedAt,
          check: { status: 'missing' },
        }),
      });
    vi.stubGlobal('fetch', fetch);
    const api = createApi(createResourceRequest(scope));
    const signal = new AbortController().signal;
    expect((await api.listProblems('all', 0, signal)).problems).toEqual([derivationDraft]);
    expect((await api.checkReference(derivationDraft.id, signal)).check.status).toBe('missing');
    expect(fetch).toHaveBeenLastCalledWith(
      `${scope === 'demo' ? '/api/demo/resources' : '/api'}/problems/${derivationDraft.id}/reference-check`,
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );
  },
);
