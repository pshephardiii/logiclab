import type { CreateProblemRequest, UpdateProblemRequest } from '@logiclab/contracts';
import { authFixture, authUser } from './auth-fixture';
import type { ProblemContext } from '../src/routes/problem/context';
import type { ProblemDraft } from '@logiclab/contracts';
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
export function problemFixture() {
  const auth = authFixture();
  const problems = {
    create: jest.fn(async (_ownerId: string, _input: CreateProblemRequest) => problem),
    list: jest.fn(async (_ownerId: string, _limit: number, _offset: number) => [problem]),
    findOwned: jest.fn(
      async (_ownerId: string, _problemId: string): Promise<ProblemDraft | null> => problem,
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
