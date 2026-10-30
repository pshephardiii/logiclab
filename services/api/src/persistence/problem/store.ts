import {
  libraryProblemDefinition,
  publicationDefinition,
} from '../../application/problem/library-definition';
import {
  checkDerivationReference,
  type DerivationReferenceCheck,
} from '../../application/problem/derivation-authoring';
import { UnsupportedProblemDefinitionError } from '../../application/problem/definition-support';
import { transactionRunner, type DatabaseManager } from '../transactions';
import { libraryProblemVersion } from './version-response';
import type { createDatabase, Problem as ProblemEntity } from '@logiclab/db' with {
  'resolution-mode': 'import',
};
import type { ProblemArchiveFilter } from '@logiclab/contracts';
import type {
  CreateLibraryProblemRequest,
  UpdateLibraryProblemRequest,
  LibraryProblemDraft,
  LibraryProblemVersion,
} from '@logiclab/contracts/derivation';

export type UpdateProblemResult =
  | { status: 'updated'; problem: LibraryProblemDraft }
  | { status: 'not_found' }
  | { status: 'archived' };

export type PublishProblemResult =
  | { status: 'published'; version: LibraryProblemVersion }
  | { status: 'not_found' }
  | { status: 'archived' };

export interface ProblemStore {
  previewReference(
    ownerId: string,
    problemId: string,
  ): Promise<{ problemId: string; updatedAt: string; check: DerivationReferenceCheck } | null>;
  publish(ownerId: string, problemId: string): Promise<PublishProblemResult>;
  setArchived(
    ownerId: string,
    problemId: string,
    archived: boolean,
  ): Promise<LibraryProblemDraft | null>;
  listVersions(
    ownerId: string,
    problemId: string,
    limit: number,
    offset: number,
  ): Promise<LibraryProblemVersion[] | null>;
  findVersion(
    ownerId: string,
    problemId: string,
    version: number,
  ): Promise<LibraryProblemVersion | null>;
  create(ownerId: string, input: CreateLibraryProblemRequest): Promise<LibraryProblemDraft>;
  list(
    ownerId: string,
    limit: number,
    offset: number,
    archive?: ProblemArchiveFilter,
  ): Promise<LibraryProblemDraft[]>;
  findOwned(ownerId: string, problemId: string): Promise<LibraryProblemDraft | null>;
  update(
    ownerId: string,
    problemId: string,
    input: UpdateLibraryProblemRequest,
  ): Promise<UpdateProblemResult>;
}

function draft(problem: ProblemEntity): LibraryProblemDraft {
  return {
    id: problem.id,
    title: problem.title,
    instructions: problem.instructions ?? null,
    definition: libraryProblemDefinition(problem.definition),
    archivedAt: problem.archivedAt?.toISOString() ?? null,
    createdAt: problem.createdAt.toISOString(),
    updatedAt: problem.updatedAt.toISOString(),
  };
}

/** Every query scopes ownership; updates lock the row before checking archive state. */
export async function createProblemStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  transaction?: DatabaseManager,
): Promise<ProblemStore> {
  const transact = transactionRunner(orm, transaction);
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
    async previewReference(ownerId, problemId) {
      const problem = await (transaction ?? orm.em.fork()).findOne(Problem, {
        id: problemId,
        owner: ownerId,
      });
      if (!problem) return null;
      const definition = libraryProblemDefinition(problem.definition);
      if (definition.type !== 'derivation') throw new UnsupportedProblemDefinitionError();
      return {
        problemId: problem.id,
        updatedAt: problem.updatedAt.toISOString(),
        check: checkDerivationReference(definition),
      };
    },
    async publish(ownerId, problemId) {
      return transact(async (em) => {
        // The parent lock serializes numbering and snapshots against edits and archiving.
        const problem = await lockedProblem(em, ownerId, problemId);
        if (!problem) return { status: 'not_found' as const };
        if (problem.archivedAt) return { status: 'archived' as const };
        const definition = publicationDefinition(problem.definition);
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
          definition: structuredClone(definition),
        });
        em.persist(version);
        await em.flush();
        return { status: 'published' as const, version: libraryProblemVersion(version) };
      });
    },
    async setArchived(ownerId, problemId, archived) {
      return transact(async (em) => {
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
      const em = transaction ?? orm.em.fork();
      if (!(await em.findOne(Problem, { id: problemId, owner: ownerId }))) return null;
      const versions = await em.find(
        ProblemVersion,
        { problem: { id: problemId, owner: ownerId } },
        { limit, offset, orderBy: { version: 'DESC' } },
      );
      return versions.map(libraryProblemVersion);
    },
    async findVersion(ownerId, problemId, version) {
      const value = await (transaction ?? orm.em.fork()).findOne(ProblemVersion, {
        problem: { id: problemId, owner: ownerId },
        version,
      });
      return value ? libraryProblemVersion(value) : null;
    },
    async create(ownerId, input) {
      const em = transaction ?? orm.em.fork();
      const problem = em.create(Problem, {
        owner: em.getReference(User, ownerId),
        title: input.title,
        instructions: input.instructions ?? undefined,
        definition: libraryProblemDefinition(input.definition),
      });
      em.persist(problem);
      await em.flush();
      return draft(problem);
    },
    async list(ownerId, limit, offset, archive = 'active') {
      const rows = await (transaction ?? orm.em.fork()).find(
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
      const problem = await (transaction ?? orm.em.fork()).findOne(Problem, {
        id: problemId,
        owner: ownerId,
      });
      return problem ? draft(problem) : null;
    },
    async update(ownerId, problemId, input) {
      return transact(async (em) => {
        const problem = await lockedProblem(em, ownerId, problemId);
        if (!problem) return { status: 'not_found' as const };
        if (problem.archivedAt) return { status: 'archived' as const };
        if (input.title !== undefined) problem.title = input.title;
        if (input.instructions !== undefined)
          problem.instructions = input.instructions ?? undefined;
        if (input.definition !== undefined)
          problem.definition = libraryProblemDefinition(input.definition);
        await em.flush();
        return { status: 'updated' as const, problem: draft(problem) };
      });
    },
  };
}
