import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { fitchContent, fitchReferenceSolution } from './fitch/authoring';
import { dependencyContent, dependencyReferenceSolution } from './dependency/authoring';
import { UnsupportedProblemDefinitionError } from '../definition-support';

type Definition = Extract<LibraryProblemDefinition, { type: 'derivation' }>;

/** Public statement only; the caller supplies the authoritative saved definition. */
export function publicDerivationContent(definition: Definition) {
  if (definition.format === 'tree') throw new UnsupportedProblemDefinitionError();
  return definition.format === 'dependency'
    ? dependencyContent(definition)
    : fitchContent(definition);
}

/** Privileged projection, called only after the independent answer-release policy permits it. */
export function derivationReferenceSolution(definition: Definition) {
  if (definition.format === 'tree') throw new UnsupportedProblemDefinitionError();
  return definition.format === 'dependency'
    ? dependencyReferenceSolution(definition)
    : fitchReferenceSolution(definition);
}
