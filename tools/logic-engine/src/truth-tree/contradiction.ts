import { sameFormula } from '../proof/formula-equality';
import type { TruthTreeFormula } from './types';

/** Exact complementary formulas, in either order; callers must establish branch membership. */
export function areTruthTreeComplements(left: TruthTreeFormula, right: TruthTreeFormula): boolean {
  return (
    (left.type === 'not' && sameFormula(left.operand, right)) ||
    (right.type === 'not' && sameFormula(left, right.operand))
  );
}
