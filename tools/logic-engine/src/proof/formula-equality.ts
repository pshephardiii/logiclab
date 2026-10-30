import type { ProofFormula } from './types';

/** Match parsed structure, never logical equivalence or an implicit rewrite rule. */
export function sameFormula(left: ProofFormula, right: ProofFormula): boolean {
  switch (left.type) {
    case 'variable':
      return right.type === 'variable' && left.name === right.name;
    case 'bottom':
      return right.type === 'bottom';
    case 'not':
      return right.type === 'not' && sameFormula(left.operand, right.operand);
    case 'binary':
      return (
        right.type === 'binary' &&
        left.operator === right.operator &&
        sameFormula(left.left, right.left) &&
        sameFormula(left.right, right.right)
      );
  }
}
