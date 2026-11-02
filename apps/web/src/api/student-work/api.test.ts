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

test.each(['normal', 'demo'] as const)(
  'proof drafts/checks/solutions use %s scoped transport with strict projections',
  async (scope) => {
    const { proofWork, proofSaved, proofAnswer, checkedProof, proofSolution, proofFinal } =
      await import('../../../test/proof-work-fixture');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const client = createApi(createResourceRequest(scope));
    const signal = new AbortController().signal;
    const prefix = `/api/${scope === 'demo' ? 'demo/resources/' : ''}student/assignments/${proofWork.id}`;
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assignment: proofWork, attempt: proofSaved }),
    });
    await expect(client.readAssignedWork(proofWork.id, signal)).resolves.toEqual({
      assignment: proofWork,
      attempt: proofSaved,
    });
    const input = { revision: 1, itemId: itemA, answers: proofAnswer };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ attempt: proofSaved }) });
    await expect(client.saveAssignedAnswers(proofWork.id, input, signal)).resolves.toEqual(
      proofSaved,
    );
    expect(fetch).toHaveBeenLastCalledWith(
      `${prefix}/attempt`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input), signal }),
    );
    fetch.mockResolvedValueOnce({ ok: true, json: async () => checkedProof });
    await expect(
      client.checkAssignedAnswers(proofWork.id, { itemId: itemA, answers: proofAnswer }, signal),
    ).resolves.toEqual(checkedProof);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ itemId: itemA, solution: proofSolution }),
    });
    await expect(client.readAssignedSolution(proofWork.id, itemA, signal)).resolves.toEqual(
      proofSolution,
    );
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ attempt: proofFinal }) });
    await expect(client.submitAssignedWork(proofWork.id, 1, signal)).resolves.toEqual(proofFinal);
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ attempt: { ...proofFinal, score: null } }),
    });
    await expect(client.submitAssignedWork(proofWork.id, 1, signal)).rejects.toThrow();
    const leaked = structuredClone(proofWork);
    const first = leaked.items[0]!;
    if (!('content' in first)) throw new Error('Expected proof');
    Object.assign(first.content, { referenceProof: proofAnswer.proof, explanation: 'PRIVATE' });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assignment: leaked, attempt: proofSaved }),
    });
    await expect(client.readAssignedWork(proofWork.id, signal)).rejects.toThrow();
  },
);
