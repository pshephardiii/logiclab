import type { DerivationReferenceCheck } from '../../application/problem/derivation/reference-check';
import type { ProblemArchiveFilter } from '@logiclab/contracts';
import type {
  CreateLibraryProblemRequest,
  UpdateLibraryProblemRequest,
  LibraryProblemDraft,
  LibraryProblemVersion,
} from '@logiclab/contracts/problem-library';

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
