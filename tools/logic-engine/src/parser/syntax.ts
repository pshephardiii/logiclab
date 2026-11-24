import type { FormulaNode } from './types';

/** Half-open UTF-16 offsets into the original source, excluding surrounding whitespace. */
export type FormulaSourceSpan = { readonly start: number; readonly end: number };

export type FormulaExplicitGroup = FormulaSourceSpan & {
  readonly delimiter: 'parentheses' | 'brackets';
};

/** Semantic nodes retain their own span; enclosing explicit groups are listed inside-out. */
export type FormulaNodeSyntax = {
  readonly span: FormulaSourceSpan;
  readonly groups: readonly FormulaExplicitGroup[];
  readonly operatorPosition?: number;
};

/** Derived engine metadata, not student-supplied evidence or a serialized problem definition. */
export type ParsedFormulaSyntax<Atom = never> = {
  readonly source: string;
  readonly formula: FormulaNode<Atom>;
  readonly nodes: ReadonlyMap<FormulaNode<Atom>, FormulaNodeSyntax>;
};
