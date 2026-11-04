import type { ProblemType } from './enums.ts';
import type { DependencyProof } from '../proof/dependency-work.ts';

/** Private dependency definition stored in owner drafts and immutable versions. */
export type DependencyDerivationDefinition = {
  type: `${ProblemType.Derivation}`;
  definitionVersion: 1;
  format: 'dependency';
  ruleCatalogVersion: 1;
  checkerVersion: 1;
  premises: { id: string; formula: string }[];
  conclusion: string;
  rules: { id: string; label: string }[];
  referenceProof: DependencyProof | null;
  explanation?: string | null;
};
