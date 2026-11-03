import type { Problem } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { LibraryProblemDraft } from '@logiclab/contracts/problem-library';
import { libraryProblemDefinition } from '../../application/problem/library-definition';

/** Private owner projection; authorization and persistence remain with the caller. */
export function libraryProblemDraft(problem: Problem): LibraryProblemDraft {
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
