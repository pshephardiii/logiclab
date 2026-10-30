export type BinaryOperator = 'and' | 'or' | 'implies' | 'iff';

/** Parentheses and square brackets group expressions without creating separate AST nodes. */
export type FormulaNode<Atom = never> =
  | { readonly type: 'variable'; readonly name: string }
  | { readonly type: 'not'; readonly operand: FormulaNode<Atom> }
  | {
      readonly type: 'binary';
      readonly operator: BinaryOperator;
      readonly left: FormulaNode<Atom>;
      readonly right: FormulaNode<Atom>;
    }
  | Atom;

export type Formula = FormulaNode;

export type FormulaErrorCode =
  | 'INVALID_CHARACTER'
  | 'EXPECTED_EXPRESSION'
  | 'EXPECTED_CLOSING_PAREN'
  | 'EXPECTED_CLOSING_BRACKET'
  | 'UNEXPECTED_TOKEN'
  | 'FORMULA_TOO_LONG'
  | 'NESTING_LIMIT'
  | 'VARIABLE_LIMIT';

export type TokenKind = 'variable' | 'bottom' | 'not' | BinaryOperator | 'open' | 'close' | 'end';

export type Token = { kind: TokenKind; text: string; position: number };
