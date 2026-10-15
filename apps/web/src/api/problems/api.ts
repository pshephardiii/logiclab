import {
  problemListResponseSchema,
  problemResponseSchema,
  problemVersionResponseSchema,
  problemVersionListResponseSchema,
  type CreateProblemRequest,
  type ProblemArchiveFilter,
} from '@logiclab/contracts';
import { requestAccountJson } from '../account-request';

const fallback = 'Could not update or load your library. Please try again.';

export function listProblems(archive: ProblemArchiveFilter, offset: number, signal: AbortSignal) {
  return requestAccountJson(`/api/problems?archive=${archive}&offset=${offset}`, {
    schema: problemListResponseSchema,
    fallback,
    signal,
  });
}

export async function saveProblem(input: CreateProblemRequest, signal: AbortSignal, id?: string) {
  const result = await requestAccountJson(id ? `/api/problems/${id}` : '/api/problems', {
    schema: problemResponseSchema,
    fallback,
    signal,
    body: input,
    method: id ? 'PATCH' : 'POST',
  });
  return result.problem;
}

export async function archiveProblem(id: string, archived: boolean, signal: AbortSignal) {
  const result = await requestAccountJson(
    `/api/problems/${id}/${archived ? 'archive' : 'restore'}`,
    { schema: problemResponseSchema, fallback, signal, body: {} },
  );
  return result.problem;
}

export async function publishProblem(id: string, signal: AbortSignal) {
  const result = await requestAccountJson(`/api/problems/${id}/versions`, {
    schema: problemVersionResponseSchema,
    fallback,
    signal,
    body: {},
  });
  return result.version;
}

export function listVersions(id: string, offset: number, signal: AbortSignal) {
  return requestAccountJson(`/api/problems/${id}/versions?offset=${offset}`, {
    schema: problemVersionListResponseSchema,
    fallback,
    signal,
  });
}
