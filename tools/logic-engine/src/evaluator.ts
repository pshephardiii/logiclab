import type { BinaryOperator, Formula } from './parser/types';

export type VariableAssignment = Readonly<Record<string, boolean>>;

export class FormulaEvaluationError extends Error {
  readonly name = 'FormulaEvaluationError';

  constructor(
    public readonly code: 'MISSING_VARIABLE' | 'INVALID_VARIABLE_VALUE',
    public readonly variable: string,
  ) {
    super(
      code === 'MISSING_VARIABLE'
        ? `No truth value supplied for ${variable}.`
        : `Truth value for ${variable} must be a boolean.`,
    );
  }
}

/** Evaluate a parser-produced AST. Every referenced variable must be supplied. */
export function evaluateFormula(formula: Formula, assignment: VariableAssignment): boolean {
  switch (formula.type) {
    case 'variable':
      return readVariable(formula.name, assignment);
    case 'not':
      return !evaluateFormula(formula.operand, assignment);
    case 'binary': {
      // Evaluate both operands so short-circuiting cannot hide missing inputs.
      const left = evaluateFormula(formula.left, assignment);
      const right = evaluateFormula(formula.right, assignment);
      return evaluateBinaryOperation(formula.operator, left, right);
    }
  }
}

function readVariable(name: string, assignment: VariableAssignment): boolean {
  if (!Object.hasOwn(assignment, name)) {
    throw new FormulaEvaluationError('MISSING_VARIABLE', name);
  }

  const value = assignment[name];
  if (typeof value !== 'boolean') {
    throw new FormulaEvaluationError('INVALID_VARIABLE_VALUE', name);
  }

  return value;
}

function evaluateBinaryOperation(operator: BinaryOperator, left: boolean, right: boolean): boolean {
  switch (operator) {
    case 'and':
      return left && right;
    case 'or':
      return left || right;
    case 'implies':
      return !left || right;
    case 'iff':
      return left === right;
  }
}
