import type { ProblemType } from './enums.ts';
import type { TruthTree } from '../truth-tree/work.ts';

export type TruthTreeDefinition = {
  type: typeof ProblemType.TruthTree;
  definitionVersion: 1;
  checkerVersion: 1;
  ruleCatalogVersion: 1;
  premises: { id: string; formula: string }[];
  conclusion: string;
  referenceTree: TruthTree | null;
  explanation?: string | null;
};
