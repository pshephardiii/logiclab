import type {
  createDatabase,
  Problem as ProblemEntity,
  ProblemVersion as VersionEntity,
} from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type {
  CreateProblemRequest,
  UpdateProblemRequest,
  ProblemDraft,
  ProblemArchiveFilter,
  PublishedProblemVersion,
} from '@logiclab/contracts';

export type UpdateProblemResult =
  { status: 'updated'; problem: ProblemDraft } | { status: 'not_found' } | { status: 'archived' };

export type PublishProblemResult =
  | { status: 'published'; version: PublishedProblemVersion }
  | { status: 'not_found' }
  | { status: 'archived' };

export interface ProblemStore {
  publish(ownerId: string, problemId: string): Promise<PublishProblemResult>;
  setArchived(ownerId: string, problemId: string, archived: boolean): Promise<ProblemDraft | null>;
  listVersions(
    ownerId: string,
    problemId: string,
    limit: number,
    offset: number,
  ): Promise<PublishedProblemVersion[] | null>;
  findVersion(
    ownerId: string,
    problemId: string,
    version: number,
  ): Promise<PublishedProblemVersion | null>;
  create(ownerId: string, input: CreateProblemRequest): Promise<ProblemDraft>;
  list(
    ownerId: string,
    limit: number,
    offset: number,
    archive?: ProblemArchiveFilter,
  ): Promise<ProblemDraft[]>;
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

function publication(value: VersionEntity): PublishedProblemVersion {
  return {
    id: value.id,
    problemId: value.problem.id,
    version: value.version,
    title: value.title,
    instructions: value.instructions ?? null,
    definition: value.definition,
    publishedAt: value.publishedAt.toISOString(),
  };
}

/** Every query scopes ownership; updates lock the row before checking archive state. */
export async function createProblemStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
): Promise<ProblemStore> {
  const { Problem, ProblemVersion, User, LockMode } = await import('@logiclab/db');
  type TransactionManager = typeof orm.em;
  function lockedProblem(em: TransactionManager, ownerId: string, problemId: string) {
    return em.findOne(
      Problem,
      { id: problemId, owner: ownerId },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
  }
  return {
    async publish(ownerId, problemId) {
      return orm.em.fork().transactional(async (em) => {
        // The parent lock serializes numbering and snapshots against edits and archiving.
        const problem = await lockedProblem(em, ownerId, problemId);
        if (!problem) return { status: 'not_found' as const };
        if (problem.archivedAt) return { status: 'archived' as const };
        const latest = await em.findOne(
          ProblemVersion,
          { problem: problemId },
          { orderBy: { version: 'DESC' } },
        );
        const version = em.create(ProblemVersion, {
          problem,
          version: (latest?.version ?? 0) + 1,
          title: problem.title,
          instructions: problem.instructions,
          definition: structuredClone(problem.definition),
        });
        em.persist(version);
        await em.flush();
        return { status: 'published' as const, version: publication(version) };
      });
    },
    async setArchived(ownerId, problemId, archived) {
      return orm.em.fork().transactional(async (em) => {
        const problem = await lockedProblem(em, ownerId, problemId);
        if (!problem) return null;
        // Repeated archive/restore requests preserve the original timestamp/state.
        if (archived && !problem.archivedAt) problem.archivedAt = new Date();
        if (!archived && problem.archivedAt) problem.archivedAt = undefined;
        await em.flush();
        return draft(problem);
      });
    },
    async listVersions(ownerId, problemId, limit, offset) {
      const em = orm.em.fork();
      if (!(await em.findOne(Problem, { id: problemId, owner: ownerId }))) return null;
      const versions = await em.find(
        ProblemVersion,
        { problem: { id: problemId, owner: ownerId } },
        { limit, offset, orderBy: { version: 'DESC' } },
      );
      return versions.map(publication);
    },
    async findVersion(ownerId, problemId, version) {
      const value = await orm.em
        .fork()
        .findOne(ProblemVersion, { problem: { id: problemId, owner: ownerId }, version });
      return value ? publication(value) : null;
    },
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
    async list(ownerId, limit, offset, archive = 'active') {
      const rows = await orm.em.fork().find(
        Problem,
        {
          owner: ownerId,
          ...(archive === 'all' ? {} : { archivedAt: archive === 'active' ? null : { $ne: null } }),
        },
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
        const problem = await lockedProblem(em, ownerId, problemId);
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
