import type { createDatabase, Problem as ProblemEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { CreateProblemRequest, UpdateProblemRequest, ProblemDraft } from '@logiclab/contracts';

export type UpdateProblemResult =
  { status: 'updated'; problem: ProblemDraft } | { status: 'not_found' } | { status: 'archived' };

export interface ProblemStore {
  create(ownerId: string, input: CreateProblemRequest): Promise<ProblemDraft>;
  list(ownerId: string, limit: number, offset: number): Promise<ProblemDraft[]>;
  findOwned(ownerId: string, problemId: string): Promise<ProblemDraft | null>;
  update(
    ownerId: string,
    problemId: string,
    input: UpdateProblemRequest,
  ): Promise<UpdateProblemResult>;
}

function draft(problem: ProblemEntity): ProblemDraft {
  return {
    id: problem.id,
    title: problem.title,
    instructions: problem.instructions ?? null,
    definition: problem.definition,
    archivedAt: problem.archivedAt?.toISOString() ?? null,
    createdAt: problem.createdAt.toISOString(),
    updatedAt: problem.updatedAt.toISOString(),
  };
}

/** Every query scopes ownership; updates lock the row before checking archive state. */
export async function createProblemStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
): Promise<ProblemStore> {
  const { Problem, User, LockMode } = await import('@logiclab/db');
  return {
    async create(ownerId, input) {
      const em = orm.em.fork();
      const problem = em.create(Problem, {
        owner: em.getReference(User, ownerId),
        title: input.title,
        instructions: input.instructions ?? undefined,
        definition: input.definition,
      });
      em.persist(problem);
      await em.flush();
      return draft(problem);
    },
    async list(ownerId, limit, offset) {
      const rows = await orm.em.fork().find(
        Problem,
        { owner: ownerId, archivedAt: null },
        {
          limit,
          offset,
          orderBy: { createdAt: 'DESC', id: 'DESC' },
        },
      );
      return rows.map(draft);
    },
    async findOwned(ownerId, problemId) {
      const problem = await orm.em.fork().findOne(Problem, { id: problemId, owner: ownerId });
      return problem ? draft(problem) : null;
    },
    async update(ownerId, problemId, input) {
      return orm.em.fork().transactional(async (em) => {
        const problem = await em.findOne(
          Problem,
          { id: problemId, owner: ownerId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        );
        if (!problem) return { status: 'not_found' as const };
        if (problem.archivedAt) return { status: 'archived' as const };
        if (input.title !== undefined) problem.title = input.title;
        if (input.instructions !== undefined)
          problem.instructions = input.instructions ?? undefined;
        if (input.definition !== undefined) problem.definition = input.definition;
        await em.flush();
        return { status: 'updated' as const, problem: draft(problem) };
      });
    },
  };
}
