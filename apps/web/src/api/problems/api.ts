import {
  problemListResponseSchema,
  problemErrorResponseSchema,
  problemResponseSchema,
  problemVersionResponseSchema,
  problemVersionListResponseSchema,
  type CreateProblemRequest,
  type ProblemArchiveFilter,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';
import { AccountApiError } from '../errors';

/** Bind resource operations to a supplied account request transport. */
export function createApi(request: typeof requestAccountJson = requestAccountJson) {
  const problemRequestOptions = {
    fallback: 'Could not update or load your library. Please try again.',
    errorOverride: (status: number, payload: unknown) => {
      const parsed = problemErrorResponseSchema.safeParse(payload);
      return parsed.success ? new AccountApiError(parsed.data.error.message, status) : undefined;
    },
  };

  function listProblems(archive: ProblemArchiveFilter, offset: number, signal: AbortSignal) {
    return request(`/api/problems?archive=${archive}&offset=${offset}`, {
      schema: problemListResponseSchema,
      ...problemRequestOptions,
      signal,
    });
  }

  async function saveProblem(input: CreateProblemRequest, signal: AbortSignal, id?: string) {
    const result = await request(id ? `/api/problems/${id}` : '/api/problems', {
      schema: problemResponseSchema,
      ...problemRequestOptions,
      signal,
      body: input,
      method: id ? 'PATCH' : 'POST',
    });
    return result.problem;
  }

  async function archiveProblem(id: string, archived: boolean, signal: AbortSignal) {
    const result = await request(`/api/problems/${id}/${archived ? 'archive' : 'restore'}`, {
      schema: problemResponseSchema,
      ...problemRequestOptions,
      signal,
      body: {},
    });
    return result.problem;
  }

  async function publishProblem(id: string, signal: AbortSignal) {
    const result = await request(`/api/problems/${id}/versions`, {
      schema: problemVersionResponseSchema,
      ...problemRequestOptions,
      signal,
      body: {},
    });
    return result.version;
  }

  function listVersions(id: string, offset: number, signal: AbortSignal) {
    return request(`/api/problems/${id}/versions?offset=${offset}`, {
      schema: problemVersionListResponseSchema,
      ...problemRequestOptions,
      signal,
    });
  }

  return { listProblems, saveProblem, archiveProblem, publishProblem, listVersions };
}

export const { listProblems, saveProblem, archiveProblem, publishProblem, listVersions } =
  createApi();
