import type { TruthTreeDecomposition, TruthTreeFormula } from './types';

function negated(operand: TruthTreeFormula): TruthTreeFormula {
  return { type: 'not', operand };
}

/** One decomposition only; returned alternatives do not validate or mutate a student's tree. */
export function decomposeTruthTreeFormula(formula: TruthTreeFormula): TruthTreeDecomposition {
  if (formula.type === 'variable') return { kind: 'literal' };

  if (formula.type === 'bottom') return { kind: 'constant', value: false };

  if (formula.type === 'not') {
    const operand = formula.operand;

    if (operand.type === 'variable') return { kind: 'literal' };

    if (operand.type === 'bottom') return { kind: 'constant', value: true };

    if (operand.type === 'not') {
      return { kind: 'expansion', ruleId: 'double_negation', branches: [[operand.operand]] };
    }

    // Negating a compound changes which truth conditions must hold on each branch.
    const { left, right } = operand;

    switch (operand.operator) {
      case 'and':
        return {
          kind: 'expansion',
          ruleId: 'negated_conjunction',
          branches: [[negated(left)], [negated(right)]],
        };
      case 'or':
        return {
          kind: 'expansion',
          ruleId: 'negated_disjunction',
          branches: [[negated(left), negated(right)]],
        };
      case 'implies':
        return {
          kind: 'expansion',
          ruleId: 'negated_conditional',
          branches: [[left, negated(right)]],
        };
      case 'iff':
        return {
          kind: 'expansion',
          ruleId: 'negated_biconditional',
          branches: [
            [left, negated(right)],
            [negated(left), right],
          ],
        };
    }
  }

  const { left, right } = formula;

  // Each inner array is a conjunction; the outer alternatives form a disjunction.
  switch (formula.operator) {
    case 'and':
      return { kind: 'expansion', ruleId: 'conjunction', branches: [[left, right]] };
    case 'or':
      return { kind: 'expansion', ruleId: 'disjunction', branches: [[left], [right]] };
    case 'implies':
      return { kind: 'expansion', ruleId: 'conditional', branches: [[negated(left)], [right]] };
    case 'iff':
      return {
        kind: 'expansion',
        ruleId: 'biconditional',
        branches: [
          [left, right],
          [negated(left), negated(right)],
        ],
      };
  }
}
