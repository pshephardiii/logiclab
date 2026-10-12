import type { Formula } from './parser';

export type VariableAssignment = Readonly<Record<string, boolean>>;

export class FormulaEvaluationError extends Error {
  readonly name = 'FormulaEvaluationError';

  constructor(
    public readonly code: 'MISSING_VARIABLE' | 'INVALID_VARIABLE_VALUE',
    public readonly variable: string,
  ) {
    super(code === 'MISSING_VARIABLE'
      ? `No truth value supplied for ${variable}.`
      : `Truth value for ${variable} must be a boolean.`);
  }
}

/** Evaluate a parser-produced AST. Every referenced variable must be supplied. */
export function evaluateFormula(formula: Formula, assignment: VariableAssignment): boolean {
  switch (formula.type) {
    case 'variable': {
      if (!Object.hasOwn(assignment, formula.name)) {
        throw new FormulaEvaluationError('MISSING_VARIABLE', formula.name);
      }
      const value = assignment[formula.name];
      if (typeof value !== 'boolean') {
        throw new FormulaEvaluationError('INVALID_VARIABLE_VALUE', formula.name);
      }
      return value;
    }
    case 'not':
      return !evaluateFormula(formula.operand, assignment);
    case 'binary': {
      // Evaluate both operands so short-circuiting cannot hide missing inputs.
      const left = evaluateFormula(formula.left, assignment);
      const right = evaluateFormula(formula.right, assignment);
      switch (formula.operator) {
        case 'and': return left && right;
        case 'or': return left || right;
        case 'implies': return !left || right;
      }
    }
  }
}
