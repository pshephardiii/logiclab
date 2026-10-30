import { supportedProblemDefinition } from '../../application/problem/definition-support';
import { libraryProblemDefinition } from '../../application/problem/library-definition';
import type { LibraryProblemVersion } from '@logiclab/contracts/derivation';
import type { ProblemVersion } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { PublishedProblemVersion } from '@logiclab/contracts';

export function publishedProblemVersion(value: ProblemVersion): PublishedProblemVersion {
  return {
    id: value.id,
    problemId: value.problem.id,
    version: value.version,
    title: value.title,
    instructions: value.instructions ?? null,
    definition: supportedProblemDefinition(value.definition),
    publishedAt: value.publishedAt.toISOString(),
  };
}

/** Private owner projection; never substitute this for the assignment-admission projection. */
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
