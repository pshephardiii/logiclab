import type { ProblemDefinition, TruthTableDefinition } from '@logiclab/db' with {
  'resolution-mode': 'import',
};

/** Fail closed until a caller supplies type-specific projection/evaluation for conceptual work. */
export class UnsupportedProblemDefinitionError extends Error {
  constructor() {
    super('This problem definition is not supported by this workflow yet.');
  }
}

export function requireTruthTableDefinition(definition: ProblemDefinition): TruthTableDefinition {
  if (definition.type !== 'truth_table' || definition.definitionVersion !== 1) {
    throw new UnsupportedProblemDefinitionError();
  }
  return definition;
}
