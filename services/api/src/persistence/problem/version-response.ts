import { libraryProblemDefinition } from '../../application/problem/library-definition';
import type { LibraryProblemVersion } from '@logiclab/contracts/problem-library';
import type { ProblemVersion } from '@logiclab/db' with { 'resolution-mode': 'import' };

/** Private owner projection; callers enforce assignment admission separately before using it. */
export function libraryProblemVersion(value: ProblemVersion): LibraryProblemVersion {
  return {
    id: value.id,
    problemId: value.problem.id,
    version: value.version,
    title: value.title,
    instructions: value.instructions ?? null,
    definition: libraryProblemDefinition(value.definition),
    publishedAt: value.publishedAt.toISOString(),
  };
}
