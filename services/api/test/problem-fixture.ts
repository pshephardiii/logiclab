import type {
  ProblemArchiveFilter,
  ProblemDraft,
  PublishedProblemVersion,
} from '@logiclab/contracts';
import type { DerivationReferenceCheckResponse } from '@logiclab/contracts/derivation';
import type {
  CreateLibraryProblemRequest as CreateProblemRequest,
  UpdateLibraryProblemRequest as UpdateProblemRequest,
  LibraryProblemVersion,
  LibraryProblemDraft,
} from '@logiclab/contracts/problem-library';
import { authFixture, authUser } from './auth-fixture';
import type { ProblemContext } from '../src/routes/problem/context';
import type { UpdateProblemResult } from '../src/persistence/problem/store';

export const problem: ProblemDraft = {
  id: 'caee0582-e670-47e1-9d3b-31b88dcc78ec',
  title: 'Conjunction',
  instructions: null,
  definition: { type: 'truth_table', definitionVersion: 1, formula: 'P & Q' },
  archivedAt: null,
  createdAt: '2026-10-15T12:00:00.000Z',
  updatedAt: '2026-10-15T12:00:00.000Z',
};
export const draftInput = { title: problem.title, definition: problem.definition };
export const publishedVersion: PublishedProblemVersion = {
  id: 'f516a148-91c7-4bf3-bf7f-42cbf18ad995',
  problemId: problem.id,
  version: 1,
  title: problem.title,
  instructions: problem.instructions,
  definition: problem.definition,
  publishedAt: problem.createdAt,
};
export function problemFixture() {
  const auth = authFixture();
  const problems = {
    previewReference: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
      ): Promise<DerivationReferenceCheckResponse | null> => null,
    ),
    publish: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
      ): Promise<import('../src/persistence/problem/store').PublishProblemResult> => ({
        status: 'published',
        version: publishedVersion,
      }),
    ),
    setArchived: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
        _archived: boolean,
      ): Promise<LibraryProblemDraft | null> => problem,
    ),
    listVersions: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
        _limit: number,
        _offset: number,
      ): Promise<LibraryProblemVersion[] | null> => [publishedVersion],
    ),
    findVersion: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
        _version: number,
      ): Promise<LibraryProblemVersion | null> => publishedVersion,
    ),
    create: jest.fn(async (_ownerId: string, _input: CreateProblemRequest) => problem),
    list: jest.fn(
      async (
        _ownerId: string,
        _limit: number,
        _offset: number,
        _archive?: ProblemArchiveFilter,
      ) => [problem],
    ),
    findOwned: jest.fn(
      async (_ownerId: string, _problemId: string): Promise<LibraryProblemDraft | null> => problem,
    ),
    update: jest.fn(
      async (
        _ownerId: string,
        _problemId: string,
        _input: UpdateProblemRequest,
      ): Promise<UpdateProblemResult> => ({ status: 'updated', problem }),
    ),
  };
  const context: ProblemContext = { ...auth.context, problems };
  return { ...auth, context, problems, user: authUser };
}
