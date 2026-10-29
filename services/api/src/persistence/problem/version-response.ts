import { supportedProblemDefinition } from '../../application/problem/definition-support';
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
