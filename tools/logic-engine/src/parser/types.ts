export type BinaryOperator = 'and' | 'or' | 'implies';

/** Parentheses determine grouping but do not create separate AST nodes. */
export type Formula =
  | { readonly type: 'variable'; readonly name: string }
  | { readonly type: 'not'; readonly operand: Formula }
  | {
      readonly type: 'binary';
      readonly operator: BinaryOperator;
      readonly left: Formula;
      readonly right: Formula;
    };

export type FormulaErrorCode =
  | 'INVALID_CHARACTER'
  | 'EXPECTED_EXPRESSION'
  | 'EXPECTED_CLOSING_PAREN'
  | 'UNEXPECTED_TOKEN'
  | 'FORMULA_TOO_LONG'
  | 'NESTING_LIMIT'
  | 'VARIABLE_LIMIT';

export type TokenKind = 'variable' | 'not' | BinaryOperator | 'open' | 'close' | 'end';
export type Token = { kind: TokenKind; text: string; position: number };
