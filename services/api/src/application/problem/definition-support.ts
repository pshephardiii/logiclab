import {
  problemDefinitionSchema,
  type ProblemDefinition as AuthoredProblemDefinition,
} from '@logiclab/contracts';
import { parseFormula } from '@logiclab/logic-engine';
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

/** Validate stored/authoring content before publication or owner-facing serialization. */
export function supportedProblemDefinition(input: unknown): AuthoredProblemDefinition {
  const result = problemDefinitionSchema.safeParse(input);
  if (!result.success) throw new UnsupportedProblemDefinitionError();
  if (result.data.type === 'truth_table') parseFormula(result.data.formula);
  return result.data;
}
