import type {
  TruthTableDefinition,
  ConceptualQuestionDefinition as ConceptualProblemDefinition,
} from '@logiclab/contracts';
import type { FitchDerivationDefinition } from './derivation.ts';
import type { DependencyDerivationDefinition } from './dependency-derivation.ts';
import type { NaturalDeductionTreeDerivationDefinition } from './natural-deduction-tree-derivation.ts';
import type { TruthTreeDefinition } from './truth-tree.ts';

export type {
  TruthTableDefinition,
  TrueFalseDefinition,
  MultipleChoiceDefinition,
  ConceptualQuestionDefinition as ConceptualProblemDefinition,
} from '@logiclab/contracts';

/**
 * JSON content shared by mutable drafts and immutable published snapshots.
 * Runtime contracts validate authored data; a TypeScript union alone does not enable routes.
 * Each variant owns its definition version. Student responses remain separate.
 */
export type ProblemDefinition =
  | TruthTableDefinition
  | ConceptualProblemDefinition
  | FitchDerivationDefinition
  | DependencyDerivationDefinition
  | NaturalDeductionTreeDerivationDefinition
  | TruthTreeDefinition;
