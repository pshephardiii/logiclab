import type { LibraryProblemDefinition } from '@logiclab/contracts/problem-library';
import { fitchContent, fitchReferenceSolution } from './fitch/authoring';
import { dependencyContent, dependencyReferenceSolution } from './dependency/authoring';
import {
  naturalDeductionTreeContent,
  naturalDeductionTreeReferenceSolution,
} from './natural-deduction-tree/authoring';

type Definition = Extract<LibraryProblemDefinition, { type: 'derivation' }>;

/** Public statement only; the caller supplies the authoritative saved definition. */
export function publicDerivationContent(definition: Definition) {
  if (definition.format === 'tree') return naturalDeductionTreeContent(definition);

  return definition.format === 'dependency'
    ? dependencyContent(definition)
    : fitchContent(definition);
}

/** Privileged projection, called only after the independent answer-release policy permits it. */
export function derivationReferenceSolution(definition: Definition) {
  if (definition.format === 'tree') return naturalDeductionTreeReferenceSolution(definition);

  return definition.format === 'dependency'
    ? dependencyReferenceSolution(definition)
    : fitchReferenceSolution(definition);
}
