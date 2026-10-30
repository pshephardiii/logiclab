import type { FormulaNode } from '../parser/types';

/** Falsity is an atom in the proof language, never the ordinary variable F. */
export type ProofFormula = FormulaNode<{ readonly type: 'bottom' }>;
