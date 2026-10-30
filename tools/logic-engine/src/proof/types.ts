import type { FormulaNode } from '../parser/types';

/** Falsity is an atom in the proof language, never the ordinary variable F. */
export type ProofFormula = FormulaNode<{ readonly type: 'bottom' }>;

/** Formula obligations only: this does not certify scope, closure or dependencies. */
export type LocalSubproof = {
  assumption: ProofFormula;
  conclusion: ProofFormula;
};
